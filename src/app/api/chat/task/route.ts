import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Google AI API key is not configured');
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

    // Use the system prompt from the task if available, otherwise use a default
    let systemPrompt = task.systemPrompt || `You are an AI assistant helping with insurance tasks. 

${taskContext}

Please assist the user in completing this task by providing guidance, asking relevant questions, and helping them gather the necessary information.`;

    // If this is an AI task, modify the system prompt for automated execution
    if (task.tag === 'ai') {
      systemPrompt = `${task.systemPrompt || systemPrompt}

${taskContext}

This is an AI-automated task. Please execute the task automatically based on the available company information and provide a complete response with any generated documents or analysis.`;
    } else if (task.tag === 'manual') {
      systemPrompt = `${task.systemPrompt || systemPrompt}

${taskContext}

This is a manual task requiring user input. Please guide the user through the process, ask relevant questions, and help them provide the necessary information to complete the task.`;
    }

    // Convert messages to the format expected by the AI SDK
    const convertedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter((msg: any) => msg.content.trim().length > 0);

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages: convertedMessages,
      system: systemPrompt,
    });

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