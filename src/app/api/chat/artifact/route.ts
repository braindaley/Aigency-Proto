import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

    // Build context
    const taskContext = `
TASK DETAILS:
- Task Name: ${task.taskName}
- Description: ${task.description}
- Task Type: ${task.tag}
- Phase: ${task.phase}
- Status: ${task.status}

COMPANY DETAILS:
- Company Name: ${company.name}
- Description: ${company.description || 'No description available'}
- Website: ${company.website || 'No website provided'}
`;

    let systemPrompt = '';
    
    if (generateArtifact) {
      systemPrompt = `You are an AI assistant that generates structured documents for insurance tasks.

${task.systemPrompt || ''}

${taskContext}

IMPORTANT INSTRUCTIONS:
1. Generate a complete, professional document for the task "${task.taskName}"
2. The document should be in Markdown format
3. Include all relevant sections based on the task requirements
4. You MUST wrap the ENTIRE generated document content between <artifact> and </artifact> tags
5. Do not include any explanation outside the artifact tags - ONLY output the artifact tags and content
6. The document should be ready to use immediately

REQUIRED FORMAT (you must follow this exactly):
<artifact>
# ${task.taskName}

[Your complete document content here in markdown format]
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

Please provide helpful guidance and information to complete this task.`;
    }

    // Convert messages for AI SDK
    const convertedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter((msg: any) => msg.content.trim().length > 0);

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages: convertedMessages,
      system: systemPrompt,
      temperature: 0.7,
    });

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