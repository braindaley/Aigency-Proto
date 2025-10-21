import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🤖 AI-TASK-COMPLETION: Request received`);

  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Google AI API key not configured`);
      throw new Error('Google AI API key is not configured');
    }

    const { taskId, companyId } = await request.json();

    console.log(`[${timestamp}] 📋 AI-TASK-COMPLETION: Processing taskId=${taskId}, companyId=${companyId}`);

    if (!taskId || !companyId) {
      console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Missing required parameters`);
      return NextResponse.json(
        { error: 'Missing taskId or companyId' },
        { status: 400 }
      );
    }

    // Fetch the AI task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Task not found: ${taskId}`);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    console.log(`[${timestamp}] 📝 AI-TASK-COMPLETION: Task loaded: "${task.taskName}"`);
    console.log(`[${timestamp}]   - Tag: ${task.tag}`);
    console.log(`[${timestamp}]   - Status: ${task.status}`);
    console.log(`[${timestamp}]   - Has test criteria: ${task.testCriteria ? 'Yes' : 'No'}`);

    // Verify this is an AI task
    if (task.tag !== 'ai') {
      console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Not an AI task (tag: ${task.tag})`);
      return NextResponse.json(
        { error: 'This endpoint only processes AI tasks' },
        { status: 400 }
      );
    }

    // Prevent duplicate execution on already completed tasks
    if (task.status === 'completed') {
      console.log(`[${timestamp}] ⏭️ AI-TASK-COMPLETION: Task already completed, skipping execution`);
      return NextResponse.json({
        success: true,
        taskCompleted: true,
        message: 'Task was already completed',
        skipped: true
      });
    }

    // Get enhanced context with vector search
    const context = await DataService.getEnhancedAITaskContext(companyId, taskId);
    
    // DEBUG: Log what data we're actually getting
    console.log('=== AI TASK COMPLETION DEBUG ===');
    console.log('Task ID:', taskId);
    console.log('Company ID:', companyId);
    console.log('Available documents:', context.allDocuments.length);
    console.log('Available artifacts:', context.allArtifacts.length);
    console.log('Completed tasks:', context.completedTasks.length);
    console.log('Context length:', context.relevantContent.length);
    
    if (context.allArtifacts.length > 0) {
      console.log('First artifact sample:', context.allArtifacts[0]);
    }
    if (context.allDocuments.length > 0) {
      console.log('First document sample:', context.allDocuments[0]);
    }
    
    console.log('Relevant content preview:', context.relevantContent.substring(0, 500));

    // Build comprehensive prompt for AI task completion
    // First check if the task has its own systemPrompt
    let baseSystemPrompt = task.systemPrompt || '';

    // If no system prompt on the task instance, try to fetch from templates
    if (!baseSystemPrompt && task.taskName) {
      console.log(`[${timestamp}] 🔍 AI-TASK-COMPLETION: No systemPrompt on task, fetching from templates...`);

      // Query the tasks collection (templates) by taskName
      const templatesQuery = query(
        collection(db, 'tasks'),
        where('taskName', '==', task.taskName)
      );
      const templateSnapshot = await getDocs(templatesQuery);

      if (!templateSnapshot.empty) {
        const template = templateSnapshot.docs[0].data();
        baseSystemPrompt = template.systemPrompt || '';

        // Also update the task instance with the template's systemPrompt for future use
        if (baseSystemPrompt) {
          console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Found systemPrompt in template (${baseSystemPrompt.length} chars)`);
          await updateDoc(taskDocRef, {
            systemPrompt: baseSystemPrompt,
            testCriteria: template.testCriteria || task.testCriteria || '',
            showDependencyArtifacts: template.showDependencyArtifacts ?? task.showDependencyArtifacts ?? false
          });
        }
      } else {
        console.log(`[${timestamp}] ⚠️ AI-TASK-COMPLETION: No template found for taskName: ${task.taskName}`);
      }
    }

    // If still no custom system prompt, use the generic one
    if (!baseSystemPrompt) {
      console.log(`[${timestamp}] ℹ️ AI-TASK-COMPLETION: Using generic system prompt`);
      baseSystemPrompt = `You are an AI assistant that automatically completes insurance tasks using available company data and previous task artifacts.`;
    }

    const systemPrompt = `${baseSystemPrompt}

TASK TO COMPLETE:
- Task Name: ${task.taskName}
- Description: ${task.description}
- Phase: ${task.phase}
- Type: ${task.tag}

CRITICAL REQUIREMENT - YOU MUST GENERATE AN ARTIFACT:
For this task to be considered complete, you MUST create a document wrapped in <artifact> tags.
The artifact should be a complete, professional document that fulfills the task requirements.

MULTIPLE ARTIFACTS SUPPORT:
- If the task requires creating MULTIPLE separate documents (e.g., personalized emails to different carriers),
  you can generate multiple artifacts by wrapping each one in separate <artifact> tags with an id attribute
- Format: <artifact id="unique-identifier">content</artifact>
- Example for carrier emails:
  <artifact id="starr-email">Email content for Starr...</artifact>
  <artifact id="arch-email">Email content for Arch...</artifact>
- The id should be descriptive and unique for each artifact
- Each artifact should be complete and standalone

CRITICAL - DO NOT INCLUDE IN THE ARTIFACT:
- Do NOT include disclaimers about AI limitations within the artifact document
- Do NOT mention "As an AI, I cannot..." or similar limitation statements in the artifact
- Do NOT include notes about inability to access external data or live web searches in the artifact
- The artifact should be a clean, professional document without any AI-related meta-commentary
- If you need to note limitations, mention them BEFORE the artifact tags, never inside them

Example format (single artifact):
<artifact>
# Document Title

[Complete document content here with all necessary sections, data, and professional formatting]
</artifact>

Example format (multiple artifacts):
<artifact id="document-1">
# First Document Title
[Complete document content...]
</artifact>

<artifact id="document-2">
# Second Document Title
[Complete document content...]
</artifact>

${task.systemPrompt || ''}

AVAILABLE CONTEXT:
${context.relevantContent}

ARTIFACT SEARCH & DATA UTILIZATION INSTRUCTIONS:
You have access to extensive company data including:
- ${context.allDocuments.length} documents from completed tasks
- ${context.allArtifacts.length} artifacts (generated documents, reports, analysis) from previous work
- ${context.completedTasks.length} completed tasks with full history

ENHANCED SEARCH CAPABILITIES:
1. ANALYZE ALL ARTIFACTS: Search through all artifacts for relevant information including:
   - Policy documents and certificates
   - Risk assessments and analysis reports
   - Financial data and calculations
   - Compliance documents and audit reports
   - Claims history and documentation
   - Renewal information and recommendations
   - Any JSON data structures with company/policy details

2. CROSS-REFERENCE DATA: Look for patterns and connections across:
   - Multiple completed tasks in the same phase
   - Related documents that might contain complementary information
   - Previous AI-generated artifacts that solved similar problems
   - Historical data trends and analysis

3. DATA EXTRACTION: Extract and utilize specific data points such as:
   - Policy numbers, coverage amounts, deductibles
   - Company financial metrics and ratios
   - Risk scores and assessment criteria
   - Renewal dates and notification requirements
   - Regulatory compliance status
   - Claims frequency and severity data

TASK COMPLETION INSTRUCTIONS:
1. COMPREHENSIVE SEARCH: First, thoroughly search through ALL available artifacts and documents
2. DATA SYNTHESIS: Combine relevant information from multiple sources
3. INTELLIGENT ANALYSIS: Apply insurance expertise to interpret the data
4. COMPLETE EXECUTION: Generate a comprehensive response using found data
5. ARTIFACT GENERATION: If creating documents, wrap them in <artifact> tags
6. SOURCE REFERENCING: Mention which previous tasks/artifacts provided key information
7. GAP IDENTIFICATION: Clearly state if critical information is missing (OUTSIDE the artifact, in chat only)

COMPLETING FORMS WITH AVAILABLE DATA:
- For renewal/policy dates: Check company renewalDate field and calculate policy periods from it
- For prior carrier information: Look in previous year's policy documents, ACORD forms, and certificates
- For missing non-critical information: Use "Not specified" or "N/A" rather than creating "Missing Information" sections
- COMPLETE the form to the best of your ability with available data
- Do NOT include "Missing Information" or "Further Questions" sections in artifacts
- The goal is a COMPLETE, USABLE document, not a list of questions

QUALITY STANDARDS:
- Use actual data from artifacts whenever possible (don't make assumptions)
- Reference specific previous tasks that provided key information
- If generating reports/documents, ensure they match industry standards
- Provide calculations and analysis based on found financial data
- Include compliance and regulatory considerations from previous work

CRITICAL: PRESENTATION REQUIREMENTS
- DO NOT include disclaimers about AI limitations or inability to access external sources
- DO NOT include "Missing Information" or "Further Questions" sections in artifacts
- Present your analysis and findings confidently and professionally
- The available company data (loss runs, safety records, compliance documents, employee data) IS the research
- Frame your work as completed research, not simulated or inferred research
- Focus on what data WAS analyzed and what findings WERE discovered
- Do not mention being unable to access websites, databases, or external sources
- IMPORTANT: If the task mentions "research OSHA data" or "company website", the research IS the analysis of provided internal documents - loss runs ARE the safety data, employee data IS the OSHA-relevant information
- Never state that you "need to" access external sources - you have everything needed in the provided documents

FORM COMPLETION REQUIREMENTS (for ACORD forms and similar structured documents):
- Make reasonable inferences based on available data to fill in missing fields
- DO NOT include "data_quality", "missing_critical_info", or "requires_verification" sections
- NEVER use phrases like "Not available", "Not specified", "Not provided", "Not applicable", "N/A" - instead use actual values
- REQUIRED: Fill in ALL fields - no missing data allowed in final output

SPECIFIC DEFAULT VALUES FOR COMMON MISSING FIELDS:
- Primary Contact Name: Use "Insurance Coordinator" if no name available
- Phone: Use actual area code pattern like "(585) 555-0100" (use 585 for NY companies)
- Email: Use pattern "info@" + company website domain (e.g., info@cornerstonebuilds.com)
- Street Address: Use "123 Main Street" or infer from company operations
- City: Use the state's major city (e.g., "Buffalo" or "Rochester" for NY construction)
- ZIP Code: Use a valid code for the city (e.g., "14202" for Buffalo)
- Business Structure: Use "Corporation" if ownership structure mentions CEO/owners
- Experience Mod: Use "1.00" (industry neutral) if not in loss runs
- DBA: Use same as business name if no DBA provided
- Payroll for experience years: Use the current year's payroll as estimate for past years
- Policy Effective Date: Use January 1 of the upcoming year based on renewal date
- Employer's Liability Limits: Use standard $100,000 / $100,000 / $500,000
- Deductible: Use "No deductible" if not specified

CLASSIFICATION CODE RULES:
- EXCLUDE any codes that conflict with the primary business description
- If company is "commercial construction", EXCLUDE "residential" codes
- Only include codes with matching job descriptions or payroll data

OUTPUT FORMAT:
- For ACORD forms, use well-formatted Markdown with sections, tables, and clear headings
- Use tables for structured data (classifications, payroll, coverage limits)
- Make it visually scannable and professional
- Do NOT output raw JSON unless specifically requested in the task
- Present the form as complete and ready for carrier submission
- DO NOT include the task name as a header in artifact content (it's already shown in the UI)
- Start directly with the document content (e.g., "# Public Information Research Summary" not "# Research public info\n\n# Summary")

Your response should demonstrate deep utilization of the artifact data to complete the task professionally and accurately.`;

    // Initialize Google AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Process the task with AI
    const prompt = `${systemPrompt}\n\nPlease complete the task "${task.taskName}" using all the available company data and previous task artifacts shown in the context above.`;

    console.log(`[${timestamp}] 🔮 AI-TASK-COMPLETION: Generating AI response...`);
    const aiResult = await model.generateContent(prompt);
    const response = await aiResult.response;
    const fullText = response.text();
    console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: AI response generated (${fullText.length} characters)`);

    const result = { text: fullText };

    // Check if the AI response contains valid artifact(s) - support multiple artifacts
    const artifactMatches = result.text.matchAll(/<artifact(?:\s+id="([^"]+)")?>([\s\S]*?)<\/artifact>/g);
    const artifacts: Array<{ id?: string; content: string }> = [];

    for (const match of artifactMatches) {
      const artifactId = match[1]; // Optional ID from <artifact id="name">
      const artifactContent = match[2].trim();
      if (artifactContent.length > 100) {
        artifacts.push({ id: artifactId, content: artifactContent });
      }
    }

    const hasArtifact = artifacts.length > 0;

    // Extract any text before/after the artifact tags for the chat message
    let chatContent = result.text;
    if (hasArtifact) {
      // Remove ALL artifact tags and content from the chat message (supports multiple artifacts with IDs)
      chatContent = result.text.replace(/<artifact(?:\s+id="[^"]+")?>[\s\S]*?<\/artifact>/g, '').trim();

      // If there's no other content, provide a summary message
      if (!chatContent || chatContent.length < 20) {
        if (artifacts.length > 1) {
          chatContent = `I've generated ${artifacts.length} documents for ${task.taskName}. You can view them in the artifact viewer on the right using the navigation arrows, or download them individually.`;
        } else {
          chatContent = `I've generated the ${task.taskName} document. You can view it in the artifact viewer on the right or download it from the artifacts section.`;
        }
      }
    }

    // Create a chat message with the AI completion (without the full artifact)
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

    // Save the AI completion to the task chat
    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    await addDoc(chatRef, chatMessage);

    // Save artifact(s) to the artifacts collection if any were generated
    if (hasArtifact && artifacts.length > 0) {
      try {
        console.log(`[${timestamp}] 💾 AI-TASK-COMPLETION: Saving ${artifacts.length} artifact(s) to database...`);

        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);

        // Check if artifacts already exist for this task
        const existingQuery = query(
          artifactsRef,
          where('taskId', '==', taskId)
        );
        const existingArtifacts = await getDocs(existingQuery);

        // If we're generating a single artifact, update or create one document
        if (artifacts.length === 1) {
          // If multiple artifacts exist (shouldn't happen, but clean up if it does)
          if (existingArtifacts.size > 1) {
            console.log(`[${timestamp}] ⚠️ AI-TASK-COMPLETION: Found ${existingArtifacts.size} artifacts for task ${taskId}, will update first and delete others`);
            // Delete all but the first one
            for (let i = 1; i < existingArtifacts.docs.length; i++) {
              await deleteDoc(existingArtifacts.docs[i].ref);
              console.log(`[${timestamp}] 🗑️ AI-TASK-COMPLETION: Deleted duplicate artifact ${existingArtifacts.docs[i].id}`);
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
            // Update existing artifact
            const existingDoc = existingArtifacts.docs[0];
            await updateDoc(doc(db, `companies/${companyId}/artifacts`, existingDoc.id), artifactData);
            console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Artifact updated in database: ${existingDoc.id}`);
          } else {
            // Create new artifact
            const docRef = await addDoc(artifactsRef, {
              ...artifactData,
              createdAt: serverTimestamp()
            });
            console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Artifact saved to database: ${docRef.id}`);
          }
        } else {
          // Multiple artifacts - delete all existing and create new ones
          console.log(`[${timestamp}] 📝 AI-TASK-COMPLETION: Task generated ${artifacts.length} artifacts`);

          // Delete all existing artifacts for this task
          for (const existingDoc of existingArtifacts.docs) {
            await deleteDoc(existingDoc.ref);
            console.log(`[${timestamp}] 🗑️ AI-TASK-COMPLETION: Deleted old artifact ${existingDoc.id}`);
          }

          // Create new artifacts
          for (let i = 0; i < artifacts.length; i++) {
            const artifact = artifacts[i];
            const artifactData = {
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
            };

            const docRef = await addDoc(artifactsRef, artifactData);
            console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Artifact ${i + 1}/${artifacts.length} saved: ${docRef.id} (${artifact.id || 'unnamed'})`);
          }
        }
      } catch (error) {
        console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Failed to save artifact to database:`, error);
        // Don't fail the whole process if artifact saving fails
      }
    }

    // CRITICAL: Do NOT mark complete yet - must wait for test validation
    // Only mark complete if BOTH artifact exists AND tests pass
    let indicatesCompletion = false;

    console.log(`[${timestamp}] 🔍 AI-TASK-COMPLETION: Artifact validation:`, {
      artifactCount: artifacts.length,
      hasArtifacts: hasArtifact,
      hasTestCriteria: !!(task.testCriteria && task.testCriteria.trim()),
      responsePreview: result.text.substring(0, 300)
    });

    if (!hasArtifact) {
      console.log(`[${timestamp}] ⚠️ AI-TASK-COMPLETION: No valid artifact found in response!`);
      console.log(`[${timestamp}]   Full response length: ${result.text.length}`);
      console.log(`[${timestamp}]   Response contains '<artifact>': ${result.text.includes('<artifact>')}`);
      console.log(`[${timestamp}]   Response contains '</artifact>': ${result.text.includes('</artifact>')}`);
    }

    // If test criteria are defined, validate against them
    if (task.testCriteria && task.testCriteria.trim()) {
      console.log(`[${timestamp}] 🧪 AI-TASK-COMPLETION: Running test validation...`);

      try {
        const validationPrompt = `You are validating an AI-generated document against test criteria.

CRITICAL INSTRUCTIONS:
1. You MUST start your response with EXACTLY either "PASS" or "FAIL" on the first line
2. Evaluate based ONLY on what you can see in the document provided below
3. If the document contains content addressing the criteria, mark it as PASS
4. DO NOT ask for confirmation or additional information - evaluate what's actually present

IMPORTANT CONTEXT:
- This document was AUTOMATICALLY GENERATED by AI
- The AI has reviewed available company data to create this
- Evaluate if the generated content meets the test criteria

DOCUMENT TO VALIDATE:
${result.text}

TEST CRITERIA:
${task.testCriteria}

VALIDATION RULES:
- If you can see content in the document that addresses the test criteria → PASS
- If the document is missing, empty, or clearly incomplete → FAIL
- DO NOT fail because you "need to verify" or want "confirmation" - check if content is there
- DO NOT ask the user to "provide" or "confirm" - evaluate the visible content
- Assume the document shown above IS the complete artifact to be evaluated
- CRITICAL: If the task mentions external sources like "OSHA database" but the AI used internal documents (loss runs, employee data, safety records) to fulfill the requirement, that IS sufficient

RESPONSE FORMAT (REQUIRED):
Line 1: PASS or FAIL (exactly one of these words, nothing else on this line)
Line 2+: Your explanation

If PASS:
- Use first-person: "I've successfully completed..."
- State which criteria are met based on visible content
- Be specific about what content addresses each criterion

If FAIL:
- Use first-person: "I've generated a draft, but the document is missing..."
- State what SPECIFIC content is absent or inadequate
- If more data is needed: "Please upload [specific documents]"
- Do NOT ask for confirmation of what's already there

TONE: Professional, action-oriented, specific

REMEMBER: Start with exactly "PASS" or "FAIL" on line 1. Base your decision on the actual document content above.`;

        const validationModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { temperature: 0.1 }
        });

        const validationAiResult = await validationModel.generateContent(validationPrompt);
        const validationAiResponse = await validationAiResult.response;
        const validationText = validationAiResponse.text();

        const validationResult = { text: validationText };

        const validationResponseUpper = validationResult.text.toUpperCase();
        const testsPassed = validationResponseUpper.startsWith('PASS');

        console.log(`[${timestamp}] 🧪 AI-TASK-COMPLETION: Test validation result: ${testsPassed ? 'PASS' : 'FAIL'}`);
        console.log(`[${timestamp}]   Full validation response: ${validationResult.text}`);
        console.log(`[${timestamp}]   Response starts with: "${validationResult.text.substring(0, 50)}"`);

        // Require BOTH artifact AND passing tests
        indicatesCompletion = hasArtifact && testsPassed;
        console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Final completion decision: ${indicatesCompletion ? 'WILL COMPLETE' : 'WILL NOT COMPLETE'} (artifact=${hasArtifact}, tests=${testsPassed})`);

        // Add validation results to the chat with a conversational format
        const validationMessage = {
          role: 'assistant',
          content: validationResult.text,
          timestamp: new Date(),
          isAIGenerated: true,
          isValidation: true,
          completedAutomatically: true
        };

        const chatRef = collection(db, 'taskChats', taskId, 'messages');
        await addDoc(chatRef, validationMessage);

      } catch (validationError) {
        console.error('Test validation error:', validationError);
        // If validation fails, do NOT mark complete
        indicatesCompletion = false;
        console.log(`[${timestamp}] ❌ AI-TASK-COMPLETION: Validation error, will not mark complete`);
      }
    } else {
      // No test criteria defined - do NOT auto-complete
      console.log(`[${timestamp}] ⏸️ AI-TASK-COMPLETION: No test criteria defined - task will NOT be auto-completed`);
      console.log(`[${timestamp}]   Task requires manual review or test criteria to be added`);
    }

    // Auto-complete the task if it seems finished and passes tests
    if (indicatesCompletion) {
      console.log(`[${timestamp}] 🎉 AI-TASK-COMPLETION: Marking task as completed`);

      // Update completedBy field first, then call status update endpoint
      await updateDoc(taskDocRef, {
        completedBy: 'AI System'
      });

      // Add a friendly completion summary message
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

      // Mark as completed and trigger dependency updates via the endpoint
      console.log(`[${timestamp}] 🔗 AI-TASK-COMPLETION: Marking task complete and triggering dependent task checks...`);

      // Try to get the correct base URL
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9003';
      console.log(`[${timestamp}] 🌐 AI-TASK-COMPLETION: Using base URL: ${baseUrl}`);

      try {
        const response = await fetch(`${baseUrl}/api/update-task-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId, status: 'completed' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Status update and dependency check failed with status ${response.status}: ${errorText}`);
          throw new Error(`Status update failed: ${response.status}`);
        } else {
          const result = await response.json();
          console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Task completed and dependency updates triggered successfully:`, result);
        }
      } catch (error) {
        console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Failed to update task status via API, falling back to direct database update:`, error);

        // Fallback: Update the task status directly in the database
        try {
          await updateDoc(taskDocRef, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log(`[${timestamp}] ✅ AI-TASK-COMPLETION: Task status updated directly in database`);
        } catch (dbError) {
          console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION: Failed to update task status in database:`, dbError);
        }
      }
    } else {
      console.log(`[${timestamp}] ⏸️ AI-TASK-COMPLETION: Task not marked as completed`);
      if (!task.testCriteria || !task.testCriteria.trim()) {
        console.log(`[${timestamp}]   Reason: No test criteria defined for this task`);
      } else if (!hasArtifact) {
        console.log(`[${timestamp}]   Reason: No valid artifact generated`);
      } else {
        console.log(`[${timestamp}]   Reason: Test validation failed`);
      }
    }

    console.log(`[${timestamp}] 🏁 AI-TASK-COMPLETION: Request completed successfully`);
    return NextResponse.json({
      success: true,
      taskCompleted: indicatesCompletion,
      aiResponse: result.text,
      documentsUsed: context.allDocuments.length,
      artifactsUsed: context.allArtifacts.length,
      completedTasksReferenced: context.completedTasks.length
    });

  } catch (error) {
    console.error(`[${timestamp}] ❌ AI-TASK-COMPLETION ERROR:`, error);
    return NextResponse.json(
      { error: 'Failed to complete AI task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check AI task completion readiness
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    const companyId = searchParams.get('companyId');

    if (!taskId || !companyId) {
      return NextResponse.json(
        { error: 'Missing taskId or companyId' },
        { status: 400 }
      );
    }

    // Get task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Check if this is an AI task
    if (task.tag !== 'ai') {
      return NextResponse.json({
        canComplete: false,
        reason: 'Task is not marked as AI-enabled'
      });
    }

    // Get available context
    const context = await DataService.getAITaskContext(companyId);

    // Assess readiness
    const hasDocuments = context.allDocuments.length > 0;
    const hasArtifacts = context.allArtifacts.length > 0;
    const hasCompletedTasks = context.completedTasks.length > 0;
    
    const canComplete = hasDocuments || hasArtifacts || hasCompletedTasks;
    const readinessScore = (hasDocuments ? 40 : 0) + (hasArtifacts ? 40 : 0) + (hasCompletedTasks ? 20 : 0);

    return NextResponse.json({
      canComplete,
      readinessScore,
      availableResources: {
        documents: context.allDocuments.length,
        artifacts: context.allArtifacts.length,
        completedTasks: context.completedTasks.length
      },
      recommendations: canComplete ? [
        'AI can complete this task using available company data'
      ] : [
        'No previous tasks or documents available for AI completion',
        'Consider completing some manual tasks first to build context'
      ]
    });

  } catch (error) {
    console.error('AI readiness check error:', error);
    return NextResponse.json(
      { error: 'Failed to check AI readiness' },
      { status: 500 }
    );
  }
}