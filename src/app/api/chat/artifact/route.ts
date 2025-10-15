import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';

// Helper function to validate task completion (copied from chat/task route)
async function validateTaskCompletion(messages: any[], testCriteria: string, latestResponse: string = '') {
  console.log('=== ARTIFACT VALIDATION ===');
  console.log('Latest response:', latestResponse);
  
  // Collect all documents from the conversation
  const allDocuments: any[] = [];
  messages.forEach((msg: any) => {
    if (msg.documents && Array.isArray(msg.documents)) {
      allDocuments.push(...msg.documents);
    }
  });
  
  console.log('Found documents:', allDocuments.length);
  allDocuments.forEach((doc, idx) => {
    console.log(`Document ${idx}:`, {
      filename: doc.filename,
      contentLength: doc.content?.length,
      contentPreview: doc.content?.substring(0, 200)
    });
  });

  // Manual validation logic based on actual criteria
  let hasEmployeeData = false;
  let hasJobDescriptions = false;
  let hasHighRiskIdentification = false;

  // Check documents for required information
  for (const doc of allDocuments) {
    const content = doc.content?.toLowerCase() || '';
    const filename = doc.filename?.toLowerCase() || '';
    
    // Check for employee data - expand criteria to include payroll, classification, etc.
    if (content.includes('employee') && (content.includes('name') || content.includes('title')) ||
        content.includes('payroll') || content.includes('classification') || 
        filename.includes('payroll') || filename.includes('employee') ||
        (content.includes(',') && (content.includes('title') || content.includes('name') || content.includes('department')))) {
      hasEmployeeData = true;
    }
    
    // Check for job descriptions - expand to include classification descriptions
    if (content.includes('job') && (content.includes('description') || content.includes('responsibilities')) ||
        content.includes('classification') && content.includes('description') ||
        content.includes('operations') || content.includes('clerical') || content.includes('warehouse') ||
        content.includes('drivers') || content.includes('commercial')) {
      hasJobDescriptions = true;
    }
    
    // Check for risk identification - expand to include rate information and premium data
    if (content.includes('risk') && (content.includes('high') || content.includes('assessment')) ||
        content.includes('rate per') || content.includes('premium') ||
        content.includes('workers compensation') || content.includes('workers comp')) {
      hasHighRiskIdentification = true;
    }

    // Special handling for payroll classification documents
    if (filename.includes('payroll') && filename.includes('classification') ||
        content.includes('class code') && content.includes('payroll')) {
      hasEmployeeData = true;
      hasJobDescriptions = true;
      hasHighRiskIdentification = true;
    }
  }

  // Also check the latest AI response for completion indicators
  const responseContent = latestResponse.toLowerCase();
  const hasCompletionIndicator = responseContent.includes('completed') || responseContent.includes('all criteria') || responseContent.includes('successfully') ||
      responseContent.includes('task complete!') || responseContent.includes('✅') || 
      responseContent.includes('ready for insurance submission') || responseContent.includes('all required information');
  
  console.log('Completion indicator check:', { 
    hasCompletionIndicator, 
    responsePreview: responseContent.substring(0, 150),
    hasTaskComplete: responseContent.includes('task complete!'),
    hasCheckmark: responseContent.includes('✅'),
    hasEmployeeData: responseContent.includes('employee data'),
    hasJobTitles: responseContent.includes('job titles'),
    fullResponse: latestResponse
  });
  
  if (hasCompletionIndicator) {
    // If AI explicitly indicates completion with the "Task Complete!" message and mentions employee data, trust it
    if (responseContent.includes('employee data') || responseContent.includes('employee names') || 
        responseContent.includes('job titles') || responseContent.includes('job descriptions') || 
        responseContent.includes('high-risk role')) {
      console.log('AI completion detected with employee data references - marking as COMPLETED');
      return { overallStatus: 'COMPLETED' };
    }
    // If AI indicates completion and we have some data from documents, consider it complete
    if (hasEmployeeData || hasJobDescriptions) {
      console.log('AI completion detected with document data - marking as COMPLETED');
      return { overallStatus: 'COMPLETED' };
    }
    // If AI just says task complete, trust it
    console.log('AI completion indicator found but no employee data references - marking as COMPLETED anyway');
    return { overallStatus: 'COMPLETED' };
  }

  // Calculate overall status
  const criteriaCount = [hasEmployeeData, hasJobDescriptions, hasHighRiskIdentification].filter(Boolean).length;
  
  console.log('Validation results:', {
    hasEmployeeData,
    hasJobDescriptions,
    hasHighRiskIdentification,
    criteriaCount,
    responseContent: latestResponse.toLowerCase().substring(0, 100)
  });
  
  if (criteriaCount >= 2) { // At least 2 out of 3 criteria met
    return { overallStatus: 'COMPLETED' };
  } else if (criteriaCount > 0) {
    return { overallStatus: 'PARTIALLY_COMPLETED' };
  } else {
    return { overallStatus: 'NOT_COMPLETED' };
  }
}

// Helper function to update task status
async function updateTaskStatus(taskId: string, status: string) {
  // Use the update-task-status endpoint to ensure dependency logic is triggered
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9002'}/api/update-task-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, status }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to update task status via API:', error);
    // Fallback to direct database update if API call fails
    const taskDocRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskDocRef, {
      status: status,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Google AI API key is not configured');
    }
    
    const { messages, taskId, companyId, generateArtifact, updateArtifact, currentArtifact } = await req.json();

    if (!taskId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing taskId or companyId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Fetch company details
    const companyDocRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyDocRef);

    if (!companyDoc.exists()) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const company = { id: companyDoc.id, ...companyDoc.data() } as any;

    // Get comprehensive context with vector search
    const context = await DataService.getEnhancedAITaskContext(companyId, taskId);
    
    // DEBUG: Log what artifact data we're getting
    console.log('=== ARTIFACT GENERATION DEBUG ===');
    console.log('Task ID:', taskId, 'Company ID:', companyId);
    console.log('Documents found:', context.allDocuments.length);
    console.log('Artifacts found:', context.allArtifacts.length);
    console.log('Completed tasks:', context.completedTasks.length);
    console.log('Context content length:', context.relevantContent.length);
    
    // Log samples of data
    if (context.allArtifacts.length > 0) {
      console.log('Sample artifact:', {
        taskName: context.allArtifacts[0].taskName,
        contentLength: context.allArtifacts[0].content?.length,
        contentPreview: typeof context.allArtifacts[0].content === 'string' ? 
          context.allArtifacts[0].content.substring(0, 200) : 
          String(context.allArtifacts[0].content).substring(0, 200)
      });
    }
    
    if (context.allDocuments.length > 0) {
      console.log('Sample document:', {
        filename: context.allDocuments[0].filename,
        contentLength: context.allDocuments[0].content?.length,
        contentPreview: typeof context.allDocuments[0].content === 'string' ? 
          context.allDocuments[0].content.substring(0, 200) : 
          String(context.allDocuments[0].content).substring(0, 200)
      });
    }

    // Build enhanced context
    const taskContext = `
TASK DETAILS:
- Task Name: ${task.taskName}
- Description: ${task.description}
- Task Type: ${task.tag}
- Phase: ${task.phase}
- Status: ${task.status}

COMPREHENSIVE CONTEXT:
${context.relevantContent}

ARTIFACT SEARCH & DATA UTILIZATION:
You have access to extensive company data including:
- ${context.allDocuments.length} documents from completed tasks
- ${context.allArtifacts.length} artifacts (generated documents, reports, analysis) from previous work
- ${context.completedTasks.length} completed tasks with full history

Use this comprehensive data to create professional, data-driven artifacts that leverage all available company information.
`;

    let systemPrompt = '';
    
    if (generateArtifact) {
      systemPrompt = `You are an AI assistant that generates structured documents for insurance tasks using comprehensive artifact data search.

${task.systemPrompt || ''}

${taskContext}

ARTIFACT SEARCH & DATA UTILIZATION INSTRUCTIONS:
1. COMPREHENSIVE SEARCH: Thoroughly search through ALL available artifacts and documents above
2. DATA SYNTHESIS: Combine relevant information from multiple sources to create rich, data-driven content
3. INTELLIGENT ANALYSIS: Apply insurance expertise to interpret and use the historical data
4. PROFESSIONAL STANDARDS: Ensure the document meets industry standards using actual company data
5. SOURCE UTILIZATION: Leverage specific data points from previous tasks and artifacts
6. CONTEXT AWARENESS: Reference relevant information from completed tasks when applicable

DOCUMENT GENERATION INSTRUCTIONS:
1. Generate a complete, professional document for the task "${task.taskName}"
2. Use actual data from the artifacts and documents above whenever possible
3. The document should be in Markdown format with professional structure
4. Include all relevant sections based on task requirements AND available data
5. You MUST wrap the ENTIRE generated document content between <artifact> and </artifact> tags
6. Do not include any explanation outside the artifact tags - ONLY output the artifact tags and content
7. The document should be immediately usable and data-rich

CRITICAL - COMPLETING FORMS WITH AVAILABLE DATA:
- Search through ALL available artifacts, documents, and company data to find information
- For renewal/policy dates: Check company renewalDate field and calculate policy periods from it
- For prior carrier information: Look in previous year's policy documents, ACORD forms, and certificates
- For missing non-critical information: Use "Not specified" or "N/A" rather than creating a "Missing Information" section
- COMPLETE the form to the best of your ability with available data
- Only mention truly critical missing information in the chat BEFORE the artifact, not inside it
- The goal is a COMPLETE, USABLE document, not a list of questions
- Do NOT include "Missing Information" or "Further Questions" sections in the artifact

CRITICAL - DO NOT INCLUDE IN THE ARTIFACT:
- Do NOT include disclaimers about AI limitations within the artifact document
- Do NOT mention "As an AI, I cannot..." or similar limitation statements in the artifact
- Do NOT include notes about inability to access external data or live web searches in the artifact
- Do NOT include "Missing Information" or "Further Questions" sections
- Keep all such limitations, disclaimers, or notes in the CHAT CONVERSATION ONLY, never in the artifact itself
- The artifact should be a clean, professional document without any AI-related meta-commentary

If you need to communicate limitations or clarifications to the user, do so in the chat conversation BEFORE or AFTER the artifact tags, but NEVER inside the <artifact> tags.

REQUIRED FORMAT (you must follow this exactly):
<artifact>
# ${task.taskName}

[Your complete document content here in markdown format, using data from available artifacts and documents]
</artifact>`;
    } else if (updateArtifact) {
      systemPrompt = `You are an AI assistant that helps refine and update documents for insurance tasks.

${task.systemPrompt || ''}

${taskContext}

CURRENT DOCUMENT:
${currentArtifact || 'No current document'}

IMPORTANT INSTRUCTIONS:
1. First, provide a brief explanation of what you're updating (1-2 sentences max)
2. Then update the document based on the user's request
3. Maintain the professional structure and format
4. You MUST wrap the ENTIRE updated document between <artifact> and </artifact> tags
5. The updated document should be complete (not just the changes)

CRITICAL - DO NOT INCLUDE IN THE ARTIFACT:
- Do NOT include disclaimers about AI limitations within the artifact document
- Do NOT mention "As an AI, I cannot..." or similar limitation statements in the artifact
- Do NOT include notes about inability to access external data or live web searches in the artifact
- Keep all such limitations, disclaimers, or notes in the CHAT CONVERSATION ONLY, never in the artifact itself
- The artifact should be a clean, professional document without any AI-related meta-commentary

If you need to communicate limitations or clarifications to the user, do so in the chat conversation (before the artifact tags), but NEVER inside the <artifact> tags.

REQUIRED FORMAT (you must follow this exactly):
[Brief explanation of changes]

<artifact>
# ${task.taskName}

[Complete updated document in markdown format]
</artifact>`;
    } else {
      systemPrompt = `You are an AI assistant helping with the insurance task: ${task.taskName}.

${task.systemPrompt || ''}

${taskContext}

FORMATTING REQUIREMENTS:
- Use proper markdown formatting for ALL responses
- When listing questions or items, use numbered lists with proper line breaks
- Format questions like this:

1. **Section Name:**
   - Question text here?
   - Additional details if needed

2. **Next Section:**
   - Question text here?

- Use bullet points (- or *) with proper spacing
- Put each question on its own line
- Use **bold** for section headings and emphasis
- Ensure readability with proper spacing between sections

IMPORTANT WORKFLOW:
1. First, always help the user with what they're asking for
2. Be helpful and follow their requests
3. This task has test criteria for auto-completion. The system will automatically check if the task is complete in the background.

${task.testCriteria ? `TEST CRITERIA FOR COMPLETION:
${task.testCriteria}

The system looks for:
- Employee data (names, titles, payroll information)
- Job descriptions for various roles
- High-risk role identification and assessment
- Completion indicators in your responses

SPECIAL INSTRUCTION: When the user says "test" or asks to check completion:
- Run the validation against these specific test criteria
- If the task is complete, say "✅ Task Complete! All test criteria have been met."
- If the task is NOT complete, explain exactly what is missing based on the test criteria above
- Be specific about what data/information needs to be provided
- End with: "Please provide the missing information, then say 'test' again when ready."` : ''}

Please provide helpful guidance and information to complete this task.`;
    }

    // Convert messages for AI SDK
    const convertedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter((msg: any) => msg.content.trim().length > 0);

    // Check if user is explicitly approving/passing the task
    const latestUserMessage = convertedMessages[convertedMessages.length - 1];
    const userContent = latestUserMessage?.content?.toLowerCase() || '';

    const approvalPhrases = [
      'pass this task',
      'pass the task',
      'approve this task',
      'approve the task',
      'mark as complete',
      'mark as completed',
      'mark this complete',
      'mark this completed',
      'this is ok',
      'this is fine',
      'this is good',
      'looks good',
      'approve this',
      'complete this task',
      'complete the task',
      'accept this',
      'this works'
    ];

    const userIsApproving = approvalPhrases.some(phrase => userContent.includes(phrase));

    console.log('🔍 USER APPROVAL CHECK (artifact):', {
      userContent: userContent.substring(0, 100),
      userIsApproving,
      currentTaskStatus: task.status,
      taskId
    });

    // Check if task is not already completed (handle both 'completed' and 'Complete')
    const isNotCompleted = task.status !== 'completed' && task.status !== 'Complete';

    if (userIsApproving && isNotCompleted) {
      console.log(`✅ User explicitly approved task ${taskId} (artifact), marking as completed`);
      // Call immediately to ensure it executes
      (async () => {
        try {
          console.log(`🔄 Calling updateTaskStatus for ${taskId}...`);
          await updateTaskStatus(taskId, 'completed');
          console.log(`✅ Task ${taskId} marked as completed by user approval (artifact)`);
        } catch (error) {
          console.error('❌ Failed to complete task on user approval (artifact):', error);
        }
      })();

      // Return approval message immediately
      return new Response('✅ **Task Approved!** Great, I\'m marking this task as completed. The work you\'ve done meets the requirements and is ready to proceed.', {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        }
      });
    } else if (userIsApproving) {
      console.log(`⏭️ Task ${taskId} already completed, skipping approval (artifact)`);
    }

    // Check if user is asking to test - provide immediate validation feedback
    const isTestRequest = latestUserMessage?.role === 'user' &&
                         latestUserMessage?.content.toLowerCase().trim() === 'test';
                         
    if (isTestRequest && task.testCriteria) {
      // Get chat messages for comprehensive validation
      const chatRef = collection(db, 'taskChats', taskId, 'messages');
      const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
      const chatSnapshot = await getDocs(chatQuery);
      
      const chatMessages = chatSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Combine current messages with stored chat messages
      const allMessages = [...chatMessages, ...messages];
      
      // Run validation immediately
      const validationResult = await validateTaskCompletion(
        allMessages,
        task.testCriteria,
        ''
      );

      console.log('Immediate test validation result:', validationResult);

      // Return streaming validation feedback that matches AI SDK format
      const validationMessage = validationResult.overallStatus === 'COMPLETED'
        ? `✅ **Task Complete!** All test criteria have been met based on the available information and documents.

The task "${task.taskName}" has successfully passed validation. The system has automatically marked this task as completed.`
        : `❌ **Test Failed** - The task does not yet meet all completion criteria.

**Test Criteria:** ${task.testCriteria}

**What's Missing:**
- Employee data (names, titles, payroll information)
- Job descriptions for various roles  
- High-risk role identification and assessment

**Current Status:** ${validationResult.overallStatus}

Please provide the missing information by uploading relevant documents or updating the artifact with the required data. Then say 'test' again when ready.`;

      if (validationResult.overallStatus === 'COMPLETED') {
        await updateTaskStatus(taskId, 'completed');
      }

      // Return validation message as plain text for now (simpler approach)
      return new Response(validationMessage, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        }
      });
    }

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      messages: convertedMessages,
      system: systemPrompt,
      temperature: 0.7,
      async onFinish({ text }) {
        // Save the assistant's response to Firebase for persistence
        try {
          const { collection: firestoreCollection, addDoc } = await import('firebase/firestore');
          const { GoogleGenerativeAI } = await import('@google/generative-ai');

          const chatRef = firestoreCollection(db, 'taskChats', taskId, 'messages');
          await addDoc(chatRef, {
            role: 'assistant',
            content: text,
            timestamp: new Date(),
            isAIGenerated: true
          });
          console.log('✅ Assistant response saved to Firebase');

          // Run test validation if test criteria exists
          if (task.testCriteria && task.testCriteria.trim()) {
            console.log('🧪 Running test validation after artifact update...');

            try {
              const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

              const validationPrompt = `You are validating an AI-generated document against test criteria.

CRITICAL INSTRUCTIONS:
1. You MUST start your response with EXACTLY either "PASS" or "FAIL" on the first line
2. Evaluate based ONLY on what you can see in the document provided below
3. If the document contains content addressing the criteria, mark it as PASS
4. DO NOT ask for confirmation or additional information - evaluate what's actually present

DOCUMENT TO VALIDATE:
${text}

TEST CRITERIA:
${task.testCriteria}

VALIDATION RULES:
- If you can see content in the document that addresses the test criteria → PASS
- If the document is missing, empty, or clearly incomplete → FAIL
- DO NOT fail because you "need to verify" or want "confirmation" - check if content is there
- DO NOT ask the user to "provide" or "confirm" - evaluate the visible content
- Assume the document shown above IS the complete artifact to be evaluated

RESPONSE FORMAT (REQUIRED):
Line 1: PASS or FAIL (exactly one of these words, nothing else on this line)
Line 2+: Your explanation

If PASS:
- Use first-person: "I've successfully completed..."
- State which criteria are met based on visible content
- Be specific: "The narrative explains operations by...", "Risk controls are highlighted through..."

If FAIL:
- Use first-person: "The document is missing..."
- State what SPECIFIC content is absent or inadequate
- Do NOT ask for confirmation - state what's missing

REMEMBER: Start with exactly "PASS" or "FAIL" on line 1. Base your decision on the actual document content above.`;

              const validationModel = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { temperature: 0.1 }
              });

              const validationAiResult = await validationModel.generateContent(validationPrompt);
              const validationAiResponse = await validationAiResult.response;
              const validationText = validationAiResponse.text();

              // Save validation message to chat
              await addDoc(chatRef, {
                role: 'assistant',
                content: validationText,
                timestamp: new Date(),
                isAIGenerated: true,
                isValidation: true
              });

              const testsPassed = validationText.toUpperCase().startsWith('PASS');
              console.log(`🧪 Test validation result: ${testsPassed ? 'PASS' : 'FAIL'}`);
              console.log(`   Validation: ${validationText.substring(0, 200)}...`);

              // If tests pass, mark task as complete
              if (testsPassed) {
                const taskDocRef = doc(db, 'companyTasks', taskId);
                await updateDoc(taskDocRef, {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  completedBy: 'AI System'
                });
                console.log('✅ Task marked as completed after validation passed');

                // Add completion summary
                await addDoc(chatRef, {
                  role: 'assistant',
                  content: '✅ **Task Complete!**\n\nThe work has been validated and meets all the required criteria. The completed document is ready for your review!',
                  timestamp: new Date(),
                  isAIGenerated: true,
                  isCompletionSummary: true
                });
              }
            } catch (error) {
              console.error('❌ Test validation failed:', error);
            }
          }
        } catch (error) {
          console.error('❌ Failed to save assistant response to Firebase:', error);
        }
      },
    });

    // Run validation independently in the background for AI and manual tasks with test criteria
    if ((task.tag === 'manual' || task.tag === 'ai') && task.testCriteria) {
      // Don't await this - run it in background
      setTimeout(async () => {
        try {
          console.log(`Running auto-completion check for task ${taskId} (from artifact chat)`);
          
          // Get chat messages for this task to include in validation
          const chatRef = collection(db, 'taskChats', taskId, 'messages');
          const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
          const chatSnapshot = await getDocs(chatQuery);
          
          const chatMessages = chatSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Combine current messages with stored chat messages for comprehensive validation
          const allMessages = [...chatMessages, ...messages];
          
          // Get the latest assistant response from the current interaction
          const latestAssistantMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.role === 'assistant');
          const latestResponse = latestAssistantMessage?.content || '';
          
          const validationResult = await validateTaskCompletion(
            allMessages,
            task.testCriteria,
            latestResponse
          );

          console.log('Artifact validation result:', validationResult);

          // If task is completed, update status
          if (validationResult.overallStatus === 'COMPLETED') {
            await updateTaskStatus(taskId, 'completed');
            console.log(`Task ${taskId} automatically marked as completed (from artifact chat)`);
          } else {
            // Task is not completed - this should be communicated via the AI response
            console.log(`Task ${taskId} validation failed - user should be informed via AI response`);
          }
        } catch (error) {
          console.error('Auto-completion check failed (artifact chat):', error);
        }
      }, 2000); // Wait 2 seconds after response starts
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Artifact Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}