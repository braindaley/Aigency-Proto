/**
 * AI Task Background Worker
 * This module handles long-running AI task completion operations asynchronously
 * to avoid serverless function timeouts on Netlify (10s limit on free tier)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';
import { completeTask } from '@/lib/task-completion-utils';
import { syncTaskWithTemplate } from '@/lib/task-template-sync';

export interface AITaskJob {
  taskId: string;
  companyId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: string;
}

export class AITaskWorker {
  /**
   * Process an AI task in the background
   * This function can take as long as needed without timeout constraints
   */
  static async processTask(taskId: string, companyId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🤖 AI-TASK-WORKER: Starting background processing for taskId=${taskId}`);

    // Update job status to processing
    await this.updateJobStatus(taskId, 'processing', 'Initializing AI task completion...');

    try {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('Google Generative AI API key is not configured');
      }

      // Sync task with template before processing
      await this.updateJobStatus(taskId, 'processing', 'Syncing with task template...');
      const syncResult = await syncTaskWithTemplate(taskId, { force: false });
      if (syncResult.synced) {
        console.log(`[${timestamp}] 🔄 AI-TASK-WORKER: Task synced with template - updated: ${syncResult.updatedFields.join(', ')}`);
      }

      // Fetch the AI task details
      const taskDocRef = doc(db, 'companyTasks', taskId);
      const taskDoc = await getDoc(taskDocRef);

      if (!taskDoc.exists()) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const task = { id: taskDoc.id, ...taskDoc.data() } as any;

      console.log(`[${timestamp}] 📝 AI-TASK-WORKER: Task loaded: "${task.taskName}"`);

      // Verify this is an AI task
      if (task.tag !== 'ai') {
        throw new Error(`Not an AI task (tag: ${task.tag})`);
      }

      // Allow re-execution of completed tasks
      if (task.status === 'completed') {
        console.log(`[${timestamp}] 🔄 AI-TASK-WORKER: Task already completed, re-executing...`);
        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
        const artifactsSnapshot = await getDocs(artifactsQuery);

        for (const artifactDoc of artifactsSnapshot.docs) {
          await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactDoc.id));
        }
      }

      // Post initial message to chat letting user know AI is working
      const chatRef = collection(db, 'taskChats', taskId, 'messages');
      const startMessage = {
        role: 'assistant',
        content: `🤖 I'm working on completing the task: "${task.taskName}". This may take a moment as I gather and analyze all available company data and documents...`,
        timestamp: new Date(),
        isAIGenerated: true,
        completedAutomatically: true
      };
      await addDoc(chatRef, startMessage);

      // Update progress
      await this.updateJobStatus(taskId, 'processing', 'Gathering company data and context...');

      // Get enhanced context with vector search
      const context = await DataService.getEnhancedAITaskContext(companyId, taskId);

      console.log(`[${timestamp}] 📊 AI-TASK-WORKER: Context loaded - ${context.allDocuments.length} docs, ${context.allArtifacts.length} artifacts`);

      // Build system prompt
      let baseSystemPrompt = task.systemPrompt || '';

      if (!baseSystemPrompt && task.taskName) {
        await this.updateJobStatus(taskId, 'processing', 'Loading task template...');

        const templatesQuery = query(
          collection(db, 'tasks'),
          where('taskName', '==', task.taskName)
        );
        const templateSnapshot = await getDocs(templatesQuery);

        if (!templateSnapshot.empty) {
          const template = templateSnapshot.docs[0].data();
          baseSystemPrompt = template.systemPrompt || '';

          if (baseSystemPrompt) {
            await updateDoc(taskDocRef, {
              systemPrompt: baseSystemPrompt,
              testCriteria: template.testCriteria || task.testCriteria || '',
              showDependencyArtifacts: template.showDependencyArtifacts ?? task.showDependencyArtifacts ?? false
            });
          }
        }
      }

      if (!baseSystemPrompt) {
        baseSystemPrompt = `You are an AI assistant that automatically completes insurance tasks using available company data and previous task artifacts.`;
      }

      let systemPrompt = this.buildSystemPrompt(baseSystemPrompt, task, context);

      // Gemini 2.0 Flash has a 1M token context window (~4M chars)
      // This is more than enough to handle our full context without truncation
      console.log(`[${timestamp}] 📊 AI-TASK-WORKER: System prompt size: ${systemPrompt.length} chars (Gemini can handle up to ~4M chars)`)

      // Update progress
      await this.updateJobStatus(taskId, 'processing', 'Generating AI response...');

      // Process the task with AI using Gemini
      const userPrompt = `Please complete the task "${task.taskName}" using all the available company data and previous task artifacts shown in the context above.`;

      console.log(`[${timestamp}] 🔮 AI-TASK-WORKER: Generating AI response with Gemini 2.0 Flash...`);
      console.log(`[${timestamp}] 📊 AI-TASK-WORKER: System prompt size: ${systemPrompt.length} chars`);
      const aiResult = await generateText({
        model: google('gemini-2.0-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        maxSteps: 1,
      });

      const fullText = aiResult.text;
      console.log(`[${timestamp}] ✅ AI-TASK-WORKER: AI response generated (${fullText.length} characters)`);

      const result = { text: fullText };

      // Extract artifacts (support both XML tags and markdown code blocks)
      const artifacts: Array<{ id?: string; content: string }> = [];

      // First, try XML-style artifacts with flexible attributes: <artifact id="..." name="..." type="...">content</artifact>
      // This regex captures the id attribute and ignores other attributes
      const xmlArtifactMatches = Array.from(result.text.matchAll(/<artifact(?:\s+[^>]*?id="([^"]+)"[^>]*?)?(?:\s+[^>]*)?>(\s*[\s\S]*?)<\/artifact>/g));
      for (const match of xmlArtifactMatches) {
        const artifactId = match[1]; // Captured id if present
        const artifactContent = match[2].trim();
        if (artifactContent.length > 100) {
          artifacts.push({ id: artifactId, content: artifactContent });
        }
      }

      // Second, try markdown-style artifacts: ```artifact ... ```
      const markdownArtifactMatches = Array.from(result.text.matchAll(/```artifact\s*\n([\s\S]*?)\n```/g));
      for (const match of markdownArtifactMatches) {
        const artifactContent = match[1].trim();
        if (artifactContent.length > 100) {
          artifacts.push({ content: artifactContent });
        }
      }

      const hasArtifact = artifacts.length > 0;

      // Extract chat content (remove artifacts)
      let chatContent = result.text;
      if (hasArtifact) {
        // Remove XML-style artifacts (with any attributes)
        chatContent = chatContent.replace(/<artifact(?:\s+[^>]*)?>[\s\S]*?<\/artifact>/g, '').trim();
        // Remove markdown-style artifacts
        chatContent = chatContent.replace(/```artifact\s*\n[\s\S]*?\n```/g, '').trim();

        if (!chatContent || chatContent.length < 20) {
          if (artifacts.length > 1) {
            chatContent = `✅ I've completed the task and generated ${artifacts.length} documents for "${task.taskName}". You can view them in the artifact viewer on the right using the navigation arrows, or download them individually.`;
          } else {
            chatContent = `✅ I've completed the task "${task.taskName}" and generated the document. You can view it in the artifact viewer on the right or download it from the artifacts section.`;
          }
        } else {
          // Prepend completion indicator if the chat content doesn't already have one
          if (!chatContent.includes('✅') && !chatContent.toLowerCase().includes('completed')) {
            chatContent = `✅ Task completed!\n\n${chatContent}`;
          }
        }
      }

      // Update progress
      await this.updateJobStatus(taskId, 'processing', 'Saving AI response...');

      // Create chat message
      const chatMessage = {
        role: 'assistant',
        content: chatContent,
        timestamp: new Date(),
        isAIGenerated: true,
        usedDocuments: context.allDocuments.length,
        usedArtifacts: context.allArtifacts.length,
        completedAutomatically: true,
        hasArtifact: hasArtifact
      };

      // Reuse chatRef from above (line 72)
      await addDoc(chatRef, chatMessage);

      // Save artifacts
      if (hasArtifact && artifacts.length > 0) {
        await this.updateJobStatus(taskId, 'processing', `Saving ${artifacts.length} artifact(s)...`);
        await this.saveArtifacts(taskId, companyId, task, artifacts);
      }

      // Create email submissions for submission/follow-up tasks (sortOrder 12, 14)
      // Also include marketing email tasks (sortOrder 11) that have "email" or "marketing" in the name
      const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 ||
                               task.taskName?.toLowerCase().includes('send submission') ||
                               task.taskName?.toLowerCase().includes('send follow-up') ||
                               (task.sortOrder === 11 && (
                                 task.taskName?.toLowerCase().includes('email') ||
                                 task.taskName?.toLowerCase().includes('marketing')
                               ));

      if (isSubmissionTask && task.dependencies && task.dependencies.length > 0) {
        await this.updateJobStatus(taskId, 'processing', 'Creating email submissions...');
        await this.createSubmissionsFromDependencies(taskId, companyId, task);
      }

      // Run validation if test criteria exist
      let indicatesCompletion = false;

      if (task.testCriteria && task.testCriteria.trim()) {
        await this.updateJobStatus(taskId, 'processing', 'Running test validation...');

        const testsPassed = await this.validateTask(taskId, result.text, task.testCriteria);
        indicatesCompletion = hasArtifact && testsPassed;

        console.log(`[${timestamp}] ✅ AI-TASK-WORKER: Validation complete - ${testsPassed ? 'PASS' : 'FAIL'}`);
      } else {
        console.log(`[${timestamp}] ⏸️ AI-TASK-WORKER: No test criteria - task will not be auto-completed`);
      }

      // Auto-complete if validation passed
      if (indicatesCompletion) {
        await this.updateJobStatus(taskId, 'processing', 'Marking task as completed...');
        await this.completeTask(taskId, companyId, task, context, chatRef);
      }

      // Mark job as completed
      await this.updateJobStatus(taskId, 'completed', 'AI task processing completed successfully');

      console.log(`[${timestamp}] 🏁 AI-TASK-WORKER: Background processing completed successfully`);

    } catch (error) {
      console.error(`[${timestamp}] ❌ AI-TASK-WORKER ERROR:`, error);
      await this.updateJobStatus(
        taskId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Update job status in Firestore for real-time progress tracking
   */
  private static async updateJobStatus(
    taskId: string,
    status: AITaskJob['status'],
    progress?: string
  ): Promise<void> {
    const jobRef = doc(db, 'aiTaskJobs', taskId);

    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (progress) {
      updateData.progress = progress;
    }

    if (status === 'processing' && !await getDoc(jobRef).then(d => d.data()?.startedAt)) {
      updateData.startedAt = serverTimestamp();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = serverTimestamp();
    }

    try {
      await updateDoc(jobRef, updateData);
    } catch (error) {
      // If document doesn't exist, create it
      await addDoc(collection(db, 'aiTaskJobs'), {
        taskId,
        ...updateData,
        createdAt: serverTimestamp()
      });
    }
  }

  /**
   * Save artifacts to Firestore
   */
  private static async saveArtifacts(
    taskId: string,
    companyId: string,
    task: any,
    artifacts: Array<{ id?: string; content: string }>
  ): Promise<void> {
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const existingQuery = query(artifactsRef, where('taskId', '==', taskId));
    const existingArtifacts = await getDocs(existingQuery);

    if (artifacts.length === 1) {
      // Single artifact - update or create
      if (existingArtifacts.size > 1) {
        for (let i = 1; i < existingArtifacts.docs.length; i++) {
          await deleteDoc(existingArtifacts.docs[i].ref);
        }
      }

      const artifactData = {
        name: artifacts[0].id || task.taskName,
        type: 'text',
        data: artifacts[0].content,
        description: `AI-generated artifact for task: ${task.taskName}`,
        taskId,
        taskName: task.taskName,
        tags: [task.phase, task.tag, 'ai-canvas', 'ai-generated', 'auto-saved'],
        renewalType: null,
        updatedAt: serverTimestamp()
      };

      if (!existingArtifacts.empty) {
        await updateDoc(existingArtifacts.docs[0].ref, artifactData);
      } else {
        await addDoc(artifactsRef, {
          ...artifactData,
          createdAt: serverTimestamp()
        });
      }
    } else {
      // Multiple artifacts - delete all existing and create new ones
      for (const existingDoc of existingArtifacts.docs) {
        await deleteDoc(existingDoc.ref);
      }

      for (let i = 0; i < artifacts.length; i++) {
        const artifact = artifacts[i];
        await addDoc(artifactsRef, {
          name: artifact.id || `${task.taskName} (${i + 1} of ${artifacts.length})`,
          type: 'text',
          data: artifact.content,
          description: `AI-generated artifact for task: ${task.taskName}${artifact.id ? ` - ${artifact.id}` : ` (${i + 1}/${artifacts.length})`}`,
          taskId,
          taskName: task.taskName,
          artifactIndex: i,
          totalArtifacts: artifacts.length,
          artifactId: artifact.id,
          tags: [task.phase, task.tag, 'ai-canvas', 'ai-generated', 'auto-saved', 'multi-artifact'],
          renewalType: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  /**
   * Create email submissions from dependency task artifacts
   * For submission/follow-up tasks (sortOrder 12, 14)
   */
  private static async createSubmissionsFromDependencies(
    taskId: string,
    companyId: string,
    task: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      console.log(`[${timestamp}] 📧 AI-TASK-WORKER: Creating submissions for task ${taskId} (${task.taskName})`);

      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003';
      const response = await fetch(`${baseUrl}/api/submissions/create-from-dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          taskId,
          taskName: task.taskName,
          dependencyTaskIds: task.dependencies || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[${timestamp}] ❌ AI-TASK-WORKER: Failed to create submissions:`, errorData);
        throw new Error(errorData.error || 'Failed to create submissions');
      }

      const result = await response.json();
      console.log(`[${timestamp}] ✅ AI-TASK-WORKER: Created ${result.count} email submission(s)`);

      if (result.artifacts && result.artifacts.length > 0) {
        console.log(`[${timestamp}] 📋 AI-TASK-WORKER: Submissions created for carriers:`,
          result.artifacts.map((a: any) => a.carrierName).join(', '));
      }
    } catch (error) {
      console.error(`[${timestamp}] ❌ AI-TASK-WORKER: Error creating submissions:`, error);
      // Don't throw - we want the task to complete even if submission creation fails
      // The user can manually create submissions if needed
    }
  }

  /**
   * Validate task completion against test criteria
   */
  private static async validateTask(
    taskId: string,
    resultText: string,
    testCriteria: string
  ): Promise<boolean> {
    const systemPrompt = `You are validating an AI-generated document against test criteria.

CRITICAL INSTRUCTIONS:
1. You MUST start your response with EXACTLY either "PASS" or "FAIL" on the first line
2. Evaluate based ONLY on what you can see in the document provided below
3. If the document contains content addressing the criteria, mark it as PASS

RESPONSE FORMAT (REQUIRED):
Line 1: PASS or FAIL (exactly one of these words, nothing else on this line)
Line 2+: Your explanation`;

    const validationPrompt = `DOCUMENT TO VALIDATE:
${resultText}

TEST CRITERIA:
${testCriteria}`;

    const validationResult = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: validationPrompt,
      temperature: 0.1,
      maxSteps: 1,
    });

    const validationText = validationResult.text;

    const testsPassed = validationText.toUpperCase().startsWith('PASS');

    // Save validation message to chat
    const validationMessage = {
      role: 'assistant',
      content: validationText,
      timestamp: new Date(),
      isAIGenerated: true,
      isValidation: true,
      completedAutomatically: true
    };

    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    await addDoc(chatRef, validationMessage);

    return testsPassed;
  }

  /**
   * Mark task as completed and trigger dependencies
   */
  private static async completeTask(
    taskId: string,
    companyId: string,
    task: any,
    context: any,
    chatRef: any
  ): Promise<void> {
    const taskDocRef = doc(db, 'companyTasks', taskId);

    await updateDoc(taskDocRef, {
      completedBy: 'AI System'
    });

    // Add completion summary
    const completionSummary = {
      role: 'assistant',
      content: `✅ **Task Complete!**

Great news! I've automatically completed this task using data from ${context.completedTasks.length} previously completed tasks and ${context.allArtifacts.length} existing documents in the system.

${task.testCriteria ? 'The work has been validated and meets all the required criteria.' : 'The document has been generated and is ready for your review.'}

The completed document is available in the artifact viewer on the right. Feel free to review it and let me know if you need any adjustments!`,
      timestamp: new Date(),
      isAIGenerated: true,
      isCompletionSummary: true,
      completedAutomatically: true
    };

    await addDoc(chatRef, completionSummary);

    // Use the centralized task completion utility
    // This ensures dependency updates are ALWAYS triggered
    await completeTask(taskId, {
      retries: 3,
      fallbackToDirect: true
    });
  }

  /**
   * Build the comprehensive system prompt
   */
  private static buildSystemPrompt(baseSystemPrompt: string, task: any, context: any): string {
    return `${baseSystemPrompt}

TASK TO COMPLETE:
- Task Name: ${task.taskName}
- Description: ${task.description}
- Phase: ${task.phase}
- Type: ${task.tag}

CRITICAL REQUIREMENT - YOU MUST GENERATE AN ARTIFACT:
For this task to be considered complete, you MUST create a document wrapped in <artifact> tags.
The artifact should be a complete, professional document that fulfills the task requirements.

IMPORTANT: Use XML-style tags, NOT markdown code blocks:
✅ CORRECT:   <artifact>...document content...</artifact>
❌ INCORRECT: \`\`\`artifact\n...document content...\n\`\`\`

The artifact MUST be wrapped in <artifact> opening and closing tags.

ARTIFACT CONTENT FORMAT - ALWAYS USE MARKDOWN:
The content INSIDE the <artifact> tags MUST be formatted as clean, well-structured Markdown.
✅ CORRECT:   <artifact># Title\\n\\n## Section\\n\\nContent here...</artifact>
❌ INCORRECT: <artifact><?xml version="1.0"?><document>...</document></artifact>
❌ INCORRECT: <artifact><html><body>...</body></html></artifact>
❌ INCORRECT: <artifact>{"title": "...", "content": "..."}</artifact>

Use proper Markdown formatting:
- # for main title, ## for sections, ### for subsections
- **bold** for emphasis
- Bullet points with - or *
- Numbered lists with 1., 2., 3.
- > for blockquotes
- Inline code with backticks, code blocks with triple backticks
- [text](url) for links

DO NOT use XML, HTML, or JSON inside the artifact tags. Only use Markdown.

AVAILABLE CONTEXT:
${context.relevantContent}

ARTIFACT SEARCH & DATA UTILIZATION INSTRUCTIONS:
You have access to extensive company data including:
- ${context.allDocuments.length} documents from completed tasks
- ${context.allArtifacts.length} artifacts (generated documents, reports, analysis) from previous work
- ${context.completedTasks.length} completed tasks with full history

Your response should demonstrate deep utilization of the artifact data to complete the task professionally and accurately.`;
  }
}
