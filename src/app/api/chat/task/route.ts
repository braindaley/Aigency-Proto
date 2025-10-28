import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function to validate task completion
async function validateTaskCompletion(messages: any[], testCriteria: string, latestResponse: string) {
  console.log('=== VALIDATION DEBUG ===');
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
  
  const validationDetails = {
    hasEmployeeData,
    hasJobDescriptions,
    hasHighRiskIdentification,
    hasCompletionIndicator
  };

  const missingCriteria: string[] = [];
  if (!hasEmployeeData) {
    missingCriteria.push('employee data or payroll details');
  }
  if (!hasJobDescriptions) {
    missingCriteria.push('job descriptions');
  }
  if (!hasHighRiskIdentification) {
    missingCriteria.push('high-risk roles or loss information');
  }

  if (hasCompletionIndicator) {
    // If AI explicitly indicates completion with the "Task Complete!" message, trust it
    console.log('AI completion indicator found - marking as COMPLETED', validationDetails);
    return { overallStatus: 'COMPLETED', details: validationDetails, missingCriteria: [] };
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
    return { overallStatus: 'COMPLETED', details: validationDetails, missingCriteria: [] };
  } else if (criteriaCount > 0) {
    return { overallStatus: 'PARTIALLY_COMPLETED', details: validationDetails, missingCriteria };
  } else {
    return { overallStatus: 'NOT_COMPLETED', details: validationDetails, missingCriteria };
  }
}

// Helper function to update task status
async function updateTaskStatus(taskId: string, status: string) {
  // Use the update-task-status endpoint to ensure dependency logic is triggered
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9003'}/api/update-task-status`, {
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
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const { messages, taskId, companyId } = await req.json();

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

    // Build task-specific context
    const taskContext = `
TASK DETAILS:
- Task Name: ${task.taskName}
- Description: ${task.description}
- Task Type: ${task.tag}
- Phase: ${task.phase}
- Status: ${task.status}
- Renewal Type: ${task.renewalType}

COMPANY DETAILS:
- Company Name: ${company.name}
- Description: ${company.description || 'No description available'}
- Website: ${company.website || 'No website provided'}

TASK CONTEXT:
You are helping complete this specific insurance task for ${company.name}. The task is "${task.taskName}" and it is a ${task.tag} task in the ${task.phase} phase.
`;

    // Use a much shorter system prompt to avoid context limits
    let systemPrompt = `You are an AI assistant helping with insurance tasks for ${company.name}.

Task: ${task.taskName}
Type: ${task.tag}
Phase: ${task.phase}

FORMATTING REQUIREMENTS:
- Use proper markdown formatting for ALL responses
- When listing questions or items, use proper line breaks between each item
- Use bullet points (- or *) or numbered lists with spacing
- Use **bold** for important terms and section headings
- Ensure readability with proper spacing

IMPORTANT: Keep responses concise but well-formatted.

USER APPROVAL DETECTION:
If this is an EMAIL task (interfaceType: email) and the user says they want to send emails (like "send them", "yes send", "ok send"):
- Respond with: "📧 **Sending emails now...** I'm sending all ${task.interfaceType === 'email' ? 'prepared' : ''} emails to the carriers. Once sent, I'll mark this task as complete."

For other tasks, if the user says phrases like "pass this task", "approve this", "this is ok", "mark as complete":
- Respond with: "✅ **Task Approved!** Great, I'm marking this task as completed. The work you've done meets the requirements and is ready to proceed."

DOCUMENT ANALYSIS:
When a user uploads documents, analyze them appropriately based on their content:
- For employee/job description files: Confirm receipt of employee counts, job descriptions, and risk classifications
- For payroll classification files: Verify payroll data by classification codes and confirm accuracy
- For loss runs: Review the loss history data, check for gaps, and confirm the years covered
- For other documents: Provide specific feedback relevant to the document type

When marking a task complete, always provide task-specific feedback that reflects what was actually uploaded and reviewed.

Otherwise, provide brief guidance on what's needed.`;

    // Keep it simple for manual tasks
    if (task.tag === 'manual') {
      systemPrompt += `\n\nBe concise - users prefer short, actionable responses.`;
    }

    // Convert messages to the format expected by the AI SDK with context limiting
    const convertedMessages = messages
      .slice(-2) // Only keep last 2 messages to avoid context limit
      .map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        // Include document information but not full content to avoid context limits
        content: msg.documents 
          ? msg.content + '\n\n[Document uploaded: ' + msg.documents.map(d => {
              const filename = d.filename || '';
              const isPayrollDoc = filename.toLowerCase().includes('payroll') || filename.toLowerCase().includes('classification');
              return `${filename}${isPayrollDoc ? ' (Payroll Classification Document)' : ''}`;
            }).join(', ') + ']'
          : msg.content || ''
      }))
      .filter((msg: any) => msg.content.trim().length > 0);

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: convertedMessages,
      system: systemPrompt,
    });

    // Check if user is explicitly approving/passing the task
    const latestUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');
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
      'this works',
      'send them',
      'send the emails',
      'send all',
      'yes send',
      'go ahead'
    ];

    const userIsApproving = approvalPhrases.some(phrase => userContent.includes(phrase));

    // Check if this is an email task and user wants to send emails
    const isEmailTask = task.interfaceType === 'email';
    const userWantsToSendEmails = isEmailTask && (
      userContent.includes('send') ||
      (userContent.includes('yes') && userContent.length < 20) ||
      userContent.includes('ok') ||
      userContent.includes('approve')
    );

    console.log('🔍 USER APPROVAL CHECK:', {
      userContent: userContent.substring(0, 100),
      userIsApproving,
      isEmailTask,
      userWantsToSendEmails,
      currentTaskStatus: task.status,
      taskId
    });

    // Check if task is not already completed (handle both 'completed' and 'Complete')
    const isNotCompleted = task.status !== 'completed' && task.status !== 'Complete';

    // Handle email tasks - send emails (even if task is completed, to allow resending)
    if (userWantsToSendEmails) {
      console.log(`📧 User approved sending emails for task ${taskId}, sending now...`);
      (async () => {
        try {
          // Call the send-all-for-task API
          const sendResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9003'}/api/submissions/send-all-for-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId, taskId }),
          });

          if (sendResponse.ok) {
            console.log(`✅ Emails sent successfully for task ${taskId}`);
            // Mark task as completed after sending (if not already)
            if (isNotCompleted) {
              await updateTaskStatus(taskId, 'completed');
              console.log(`✅ Task ${taskId} marked as completed after sending emails`);
            }
          } else {
            console.error(`❌ Failed to send emails for task ${taskId}`);
          }
        } catch (error) {
          console.error('❌ Failed to send emails:', error);
        }
      })();
    } else if (userIsApproving && isNotCompleted) {
      console.log(`✅ User explicitly approved task ${taskId}, marking as completed`);
      // Don't use setTimeout - call immediately to ensure it executes
      (async () => {
        try {
          console.log(`🔄 Calling updateTaskStatus for ${taskId}...`);
          await updateTaskStatus(taskId, 'completed');
          console.log(`✅ Task ${taskId} marked as completed by user approval`);
        } catch (error) {
          console.error('❌ Failed to complete task on user approval:', error);
        }
      })();
    } else if (userIsApproving) {
      console.log(`⏭️ Task ${taskId} already completed, skipping approval`);
    }

    // Run validation independently in the background
    if ((task.tag === 'manual' || task.tag === 'ai') && task.testCriteria && !userIsApproving) {
      // Don't await this - run it in background
      setTimeout(async () => {
        try {
          console.log(`Running auto-completion check for task ${taskId}`);
          // Get the latest assistant response
          const latestAssistantMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.role === 'assistant');
          const latestResponse = latestAssistantMessage?.content || '';

          const validationResult = await validateTaskCompletion(
            messages,
            task.testCriteria,
            latestResponse
          );

          console.log('Validation result:', validationResult);

          // If task is completed, update status
          if (validationResult.overallStatus === 'COMPLETED') {
            await updateTaskStatus(taskId, 'completed');
            console.log(`Task ${taskId} automatically marked as completed`);
          }
        } catch (error) {
          console.error('Auto-completion check failed:', error);
        }
      }, 2000); // Wait 2 seconds after response starts
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Task Chat API error:', error);
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
