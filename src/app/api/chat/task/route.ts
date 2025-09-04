import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function to validate task completion
async function validateTaskCompletion(messages: any[], testCriteria: string, latestResponse: string) {
  // Collect all documents from the conversation
  const allDocuments: any[] = [];
  messages.forEach((msg: any) => {
    if (msg.documents && Array.isArray(msg.documents)) {
      allDocuments.push(...msg.documents);
    }
  });

  // Manual validation logic based on actual criteria
  let hasEmployeeData = false;
  let hasJobDescriptions = false;
  let hasHighRiskIdentification = false;

  // Check documents for required information
  for (const doc of allDocuments) {
    const content = doc.content?.toLowerCase() || '';
    
    // Check for employee data
    if (content.includes('employee') && (content.includes('name') || content.includes('title'))) {
      hasEmployeeData = true;
    }
    
    // Check for job descriptions
    if (content.includes('job') && (content.includes('description') || content.includes('responsibilities'))) {
      hasJobDescriptions = true;
    }
    
    // Check for risk identification
    if (content.includes('risk') && (content.includes('high') || content.includes('assessment'))) {
      hasHighRiskIdentification = true;
    }

    // Also check for CSV-like data structure
    if (content.includes(',') && content.includes('title') && content.includes('department')) {
      hasEmployeeData = true;
      hasJobDescriptions = true;
    }
  }

  // Also check the latest AI response for completion indicators
  const responseContent = latestResponse.toLowerCase();
  if (responseContent.includes('completed') || responseContent.includes('all criteria') || responseContent.includes('successfully')) {
    // If AI indicates completion and we have some data, consider it complete
    if (hasEmployeeData || hasJobDescriptions) {
      return { overallStatus: 'COMPLETED' };
    }
  }

  // Calculate overall status
  const criteriaCount = [hasEmployeeData, hasJobDescriptions, hasHighRiskIdentification].filter(Boolean).length;
  
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

IMPORTANT: Keep responses concise. When you see comprehensive employee data with names, job titles, and risk levels, respond with:
"✅ **Task Complete!** I've reviewed your employee data and it contains all required information:
- Employee names and job titles ✓
- Job descriptions ✓  
- High-risk role identification ✓

This data is ready for insurance submission."

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
        // Don't include document content in AI request to avoid context limits
        content: msg.documents 
          ? msg.content + '\n\n[Document uploaded: ' + msg.documents.map(d => d.filename).join(', ') + ']'
          : msg.content || ''
      }))
      .filter((msg: any) => msg.content.trim().length > 0);

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: convertedMessages,
      system: systemPrompt,
    });

    // Run validation independently in the background
    if (task.tag === 'manual' && task.testCriteria) {
      // Don't await this - run it in background
      setTimeout(async () => {
        try {
          console.log(`Running auto-completion check for task ${taskId}`);
          const validationResult = await validateTaskCompletion(
            messages,
            task.testCriteria,
            ''
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