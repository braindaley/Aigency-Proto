/**
 * Firebase Cloud Functions for AI Task Processing
 *
 * This handles long-running AI task completion that would timeout on Netlify.
 * Firebase Cloud Functions have a 60-second default timeout (9 minutes on 2nd gen),
 * which is perfect for AI processing tasks.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const {google} = require('@ai-sdk/google');
const {generateText} = require('ai');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540, // 9 minutes (max for 2nd gen)
  memory: '512MiB',
});

/**
 * Process AI Task - Main Cloud Function
 * Called from the frontend to process AI tasks in the background
 */
exports.processAITask = onCall(
  {
    cors: true, // Allow CORS from any origin (you can restrict this to your domain)
  },
  async (request) => {
    const {taskId, companyId} = request.data;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 🤖 CLOUD-FUNCTION: Processing AI task ${taskId}`);

    if (!taskId || !companyId) {
      throw new HttpsError('invalid-argument', 'Missing taskId or companyId');
    }

    // Create job status document
    const jobRef = db.collection('aiTaskJobs').doc(taskId);
    await jobRef.set({
      taskId,
      companyId,
      status: 'processing',
      progress: 'Starting AI task processing...',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // Get Google Generative AI API key from environment
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
      }

      // Fetch task details
      await updateJobStatus(jobRef, 'processing', 'Loading task details...');
      const taskDoc = await db.collection('companyTasks').doc(taskId).get();

      if (!taskDoc.exists) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const task = {id: taskDoc.id, ...taskDoc.data()};
      console.log(`[${timestamp}] 📝 Task: "${task.taskName}"`);

      // Verify it's an AI task
      if (task.tag !== 'ai') {
        throw new Error(`Not an AI task (tag: ${task.tag})`);
      }

      // Get enhanced context with full documents and dependency artifacts
      await updateJobStatus(jobRef, 'processing', 'Gathering company data...');
      const context = await getTaskContext(companyId, taskId);

      // Get system prompt
      let systemPrompt = task.systemPrompt || '';
      if (!systemPrompt && task.taskName) {
        await updateJobStatus(jobRef, 'processing', 'Loading task template...');
        const templates = await db.collection('tasks')
            .where('taskName', '==', task.taskName)
            .get();

        if (!templates.empty) {
          const template = templates.docs[0].data();
          systemPrompt = template.systemPrompt || '';
        }
      }

      if (!systemPrompt) {
        systemPrompt = 'You are an AI assistant that automatically completes insurance tasks using available company data.';
      }

      // Generate AI response with Gemini 2.0 Flash
      await updateJobStatus(jobRef, 'processing', 'Generating AI response with Gemini 2.0 Flash...');
      console.log(`[${timestamp}] 🔮 Generating AI response with Gemini 2.0 Flash...`);

      const userPrompt = `Task: ${task.taskName}\nDescription: ${task.description}\n\nAvailable Context:\n${context}\n\nPlease complete this task using all the available company data shown above. Wrap your response in <artifact> tags.`;

      const aiResult = await generateText({
        model: google('gemini-2.0-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        maxSteps: 1,
      });

      const fullText = aiResult.text;

      console.log(`[${timestamp}] ✅ AI response generated (${fullText.length} chars)`);

      // Extract artifacts
      const artifactMatches = fullText.matchAll(/<artifact(?:\s+id="([^"]+)")?>([\s\S]*?)<\/artifact>/g);
      const artifacts = [];

      for (const match of artifactMatches) {
        const artifactId = match[1];
        const artifactContent = match[2].trim();
        if (artifactContent.length > 100) {
          artifacts.push({id: artifactId, content: artifactContent});
        }
      }

      const hasArtifact = artifacts.length > 0;

      // Save chat message
      await updateJobStatus(jobRef, 'processing', 'Saving results...');
      let chatContent = fullText.replace(/<artifact(?:\s+id="[^"]+")?>[\s\S]*?<\/artifact>/g, '').trim();

      if (!chatContent && hasArtifact) {
        chatContent = artifacts.length > 1 ?
          `I've generated ${artifacts.length} documents for ${task.taskName}.` :
          `I've generated the ${task.taskName} document.`;
      }

      const chatRef = db.collection('taskChats').doc(taskId).collection('messages');
      await chatRef.add({
        role: 'assistant',
        content: chatContent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isAIGenerated: true,
        completedAutomatically: true,
        hasArtifact,
      });

      // Save artifacts
      if (hasArtifact) {
        const artifactsRef = db.collection(`companies/${companyId}/artifacts`);

        for (let i = 0; i < artifacts.length; i++) {
          const artifact = artifacts[i];
          await artifactsRef.add({
            name: artifact.id || `${task.taskName} (${i + 1}/${artifacts.length})`,
            type: 'text',
            data: artifact.content,
            description: `AI-generated artifact for task: ${task.taskName}`,
            taskId,
            taskName: task.taskName,
            tags: [task.phase, task.tag, 'ai-canvas', 'ai-generated', 'auto-saved'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Get context information for completion summary
      const completedTasksSnapshot = await db.collection('companyTasks')
          .where('companyId', '==', companyId)
          .where('status', '==', 'completed')
          .get();
      const completedTasksCount = completedTasksSnapshot.size;

      const artifactsSnapshot = await db.collection(`companies/${companyId}/artifacts`).get();
      const artifactsCount = artifactsSnapshot.size;

      // Add completion summary message
      await chatRef.add({
        role: 'assistant',
        content: `✅ **Task Complete!**

Great news! I've automatically completed this task using data from ${completedTasksCount} previously completed tasks and ${artifactsCount} existing documents in the system.

${task.testCriteria ? 'The work has been validated and meets all the required criteria.' : 'The document has been generated and is ready for your review.'}

The completed document is available in the artifact viewer on the right. Feel free to review it and let me know if you need any adjustments!`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isAIGenerated: true,
        isCompletionSummary: true,
        completedAutomatically: true,
      });

      // Mark task as completed
      await updateJobStatus(jobRef, 'processing', 'Completing task...');
      await db.collection('companyTasks').doc(taskId).update({
        status: 'completed',
        completedBy: 'AI System',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark job as completed
      await updateJobStatus(jobRef, 'completed', 'Task completed successfully!');

      console.log(`[${timestamp}] 🎉 Task completed successfully`);

      return {
        success: true,
        taskId,
        artifactsGenerated: artifacts.length,
      };
    } catch (error) {
      console.error(`[${timestamp}] ❌ Error processing task:`, error);

      await updateJobStatus(
          jobRef,
          'failed',
          error.message || 'Unknown error occurred',
      );

      throw new HttpsError('internal', error.message || 'Failed to process AI task');
    }
  },
);

/**
 * Helper function to update job status
 */
async function updateJobStatus(jobRef, status, progress) {
  await jobRef.update({
    status,
    progress,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Enhanced context gathering with full document content, artifacts, and dependency data
 * This replicates the logic from src/lib/data-service.ts getEnhancedAITaskContext()
 */
async function getTaskContext(companyId, taskId) {
  try {
    console.log('=== ENHANCED CONTEXT LOADING ===');
    console.log('Company ID:', companyId, 'Task ID:', taskId);

    // Get company information
    const companyDoc = await db.collection('companies').doc(companyId).get();
    const company = companyDoc.exists ? companyDoc.data() : null;

    // Get ALL company documents (not just 10, and with FULL content)
    const docsSnapshot = await db.collection(`companies/${companyId}/documents`).get();
    const allDocuments = [];

    docsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Check for extractedText (new), processedText (legacy), or content (legacy)
      const textContent = data.extractedText || data.processedText || data.content;
      if (textContent) {
        allDocuments.push({
          id: doc.id,
          filename: data.name || data.filename,
          content: textContent,
          type: data.type || 'unknown',
          processingStatus: data.processingStatus,
          size: textContent.length,
        });
      }
    });

    console.log(`📄 Loaded ${allDocuments.length} documents`);

    // Calculate total content size
    const totalContentSize = allDocuments.reduce((sum, doc) => sum + doc.size, 0);
    console.log(`📊 Total document content: ${totalContentSize.toLocaleString()} characters`);

    // Smart content management: If total size exceeds GPT-4o context limit, intelligently truncate
    // GPT-4o has 128K tokens (~512K chars), but we need room for system prompt, artifacts, etc.
    // Safe limit: 300K characters for documents
    const MAX_DOCUMENT_CHARS = 300000;

    if (totalContentSize > MAX_DOCUMENT_CHARS) {
      console.log(`⚠️ Content too large (${totalContentSize} chars), applying smart truncation to ${MAX_DOCUMENT_CHARS} chars`);

      // Strategy: Prioritize smaller documents (likely more focused), truncate larger ones
      allDocuments.sort((a, b) => a.size - b.size);

      let currentSize = 0;
      const truncationLimit = 15000; // Max chars per document

      allDocuments.forEach(doc => {
        const remainingBudget = MAX_DOCUMENT_CHARS - currentSize;

        if (doc.size > truncationLimit) {
          // For large documents, take first portion (usually contains key info)
          const allowedSize = Math.min(truncationLimit, remainingBudget);
          doc.content = doc.content.substring(0, allowedSize) + `\n\n[... Document truncated from ${doc.size} to ${allowedSize} characters to fit context limit ...]`;
          doc.wasTruncated = true;
          currentSize += allowedSize;
          console.log(`  ✂️ Truncated: ${doc.filename} (${doc.size} → ${allowedSize} chars)`);
        } else if (currentSize + doc.size > MAX_DOCUMENT_CHARS) {
          // If this document would exceed budget, truncate it
          const allowedSize = remainingBudget;
          doc.content = doc.content.substring(0, allowedSize) + `\n\n[... Document truncated to fit context limit ...]`;
          doc.wasTruncated = true;
          currentSize += allowedSize;
          console.log(`  ✂️ Truncated: ${doc.filename} (${doc.size} → ${allowedSize} chars)`);
        } else {
          // Document fits, include it fully
          currentSize += doc.size;
        }
      });

      console.log(`✅ Final content size: ${currentSize.toLocaleString()} characters`);
    }

    // Get ALL completed tasks for this company
    const completedTasksSnapshot = await db.collection('companyTasks')
      .where('companyId', '==', companyId)
      .where('status', '==', 'completed')
      .get();

    const completedTasks = completedTasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Loaded ${completedTasks.length} completed tasks`);

    // Get ALL artifacts for this company
    const artifactsSnapshot = await db.collection(`companies/${companyId}/artifacts`).get();
    const allArtifacts = [];

    artifactsSnapshot.docs.forEach(artifactDoc => {
      const data = artifactDoc.data();
      // Find the task name for this artifact
      const taskForArtifact = completedTasks.find(t => t.id === data.taskId);
      allArtifacts.push({
        id: artifactDoc.id,
        taskId: data.taskId,
        taskName: taskForArtifact?.taskName || data.taskName || 'Unknown Task',
        content: data.data || data.content,
        title: data.name || data.title,
      });
    });

    console.log(`📦 Loaded ${allArtifacts.length} artifacts`);

    // Load dependency task artifacts if this task has dependencies
    const dependencyArtifacts = [];
    if (taskId) {
      const currentTaskDoc = await db.collection('companyTasks').doc(taskId).get();
      if (currentTaskDoc.exists) {
        const currentTask = currentTaskDoc.data();

        if (currentTask.dependencies && Array.isArray(currentTask.dependencies) && currentTask.dependencies.length > 0) {
          console.log(`🔗 Loading artifacts from ${currentTask.dependencies.length} dependency task(s)`);

          for (const depTaskId of currentTask.dependencies) {
            try {
              const depTaskDoc = await db.collection('companyTasks').doc(depTaskId).get();

              if (depTaskDoc.exists) {
                const depTask = depTaskDoc.data();
                console.log(`  ↳ Dependency: ${depTask.taskName} (${depTask.status})`);

                if (depTask.status === 'completed') {
                  // Get artifacts for this dependency task
                  const depArtifactsSnapshot = await db.collection(`companies/${companyId}/artifacts`)
                    .where('taskId', '==', depTaskId)
                    .get();

                  depArtifactsSnapshot.docs.forEach(artifactDoc => {
                    const artifactData = artifactDoc.data();
                    console.log(`    ✓ Artifact: ${artifactData.name || 'Untitled'}`);

                    dependencyArtifacts.push({
                      taskId: depTaskId,
                      taskName: depTask.taskName,
                      artifactId: artifactDoc.id,
                      title: artifactData.name || artifactData.title,
                      content: artifactData.data || artifactData.content,
                      isDependency: true
                    });
                  });
                }
              }
            } catch (depError) {
              console.error(`Error loading dependency ${depTaskId}:`, depError);
            }
          }

          console.log(`✅ Loaded ${dependencyArtifacts.length} dependency artifact(s)`);
        }
      }
    }

    // Build comprehensive context string
    let context = '';

    // Company information
    if (company) {
      context += `\n=== COMPANY INFORMATION ===\n`;
      context += `Name: ${company.name || 'Not provided'}\n`;
      context += `Industry: ${company.industry || 'Not provided'}\n`;
      context += `Address: ${company.address || 'Not provided'}\n`;
      context += `Phone: ${company.phone || 'Not provided'}\n`;
      context += `Email: ${company.email || 'Not provided'}\n`;
      context += `Website: ${company.website || 'Not provided'}\n`;
      context += `Additional Data: ${JSON.stringify(company, null, 2)}\n`;
    }

    // Completed tasks summary
    context += `\n=== COMPLETED TASKS SUMMARY (${completedTasks.length} tasks) ===\n`;
    completedTasks.forEach(task => {
      context += `\n• ${task.taskName} (Phase: ${task.phase}, Status: ${task.status})\n`;
      context += `  - Task ID: ${task.id}\n`;
      context += `  - Description: ${task.description || 'No description'}\n`;
    });

    // All documents (with smart truncation applied if needed)
    context += `\n=== AVAILABLE DOCUMENTS (${allDocuments.length} total) ===\n`;
    allDocuments.forEach((doc, i) => {
      context += `\n${i + 1}. ${doc.filename || `Document ${i + 1}`} (${doc.type})${doc.wasTruncated ? ' [TRUNCATED]' : ''}\n`;
      context += `${doc.content}\n`;
      context += `---END OF DOCUMENT ${i + 1}---\n\n`;
    });

    // Dependency artifacts (CRITICAL for ACORD 125 to use ACORD 130 data)
    if (dependencyArtifacts.length > 0) {
      context += `\n=== DEPENDENCY TASK ARTIFACTS ===\n`;
      context += `The following artifacts were generated by completed dependency tasks. USE THIS DATA to fill in the current task:\n\n`;

      dependencyArtifacts.forEach((art, i) => {
        context += `\n--- ${art.taskName} (Task ID: ${art.taskId}) ---\n`;
        context += `Title: ${art.title || 'Untitled'}\n`;
        context += `Content:\n${art.content}\n`;
        context += `---END OF ARTIFACT ${i + 1}---\n`;
      });

      context += `\nIMPORTANT: The data above comes from prerequisite tasks and contains critical information you MUST use for the current task.\n`;
    }

    // All artifacts
    context += `\n=== AVAILABLE ARTIFACTS (${allArtifacts.length} total) ===\n`;
    allArtifacts.forEach((artifact, i) => {
      context += `\n${i + 1}. ARTIFACT FROM TASK: "${artifact.taskName}"\n`;
      context += `   Task ID: ${artifact.taskId}\n`;
      context += `   Full Content:\n${artifact.content}\n`;
      context += `   ---END OF ARTIFACT ${i + 1}---\n`;
    });

    // Summary
    context += `\n=== CONTEXT SUMMARY ===\n`;
    context += `- Total Documents: ${allDocuments.length} (with full content)\n`;
    context += `- Total Artifacts: ${allArtifacts.length}\n`;
    context += `- Dependency Artifacts: ${dependencyArtifacts.length}\n`;
    context += `- Completed Tasks: ${completedTasks.length}\n`;
    context += `- Company Data: ${company ? 'Available' : 'Not available'}\n`;

    console.log(`✅ Context built: ${context.length} characters`);
    return context || 'No additional context available.';
  } catch (error) {
    console.error('Error getting enhanced context:', error);
    return 'Error loading context.';
  }
}
