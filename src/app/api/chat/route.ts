import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { tasks as defaultTasks } from '@/lib/data';
import { DataService } from '@/lib/data-service';

export async function POST(req: Request) {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Google AI API key is not configured');
    }
    
    const { messages } = await req.json();
  
  // Fetch real data from the database
  const [companies, companyTasks, taskTemplates] = await Promise.all([
    DataService.getCompanies(),
    DataService.getCompanyTasks(),
    DataService.getTaskTemplates()
  ]);
  
  // Get AI tasks from templates
  const aiTasks = taskTemplates.filter(task => task.tag === 'ai');
  
  // Calculate statistics
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c: any) => c.status === 'active' || !c.status).length;
  const totalTasks = companyTasks.length;
  const pendingTasks = companyTasks.filter(task => task.status === 'pending').length;
  const completedTasks = companyTasks.filter(task => task.status === 'completed').length;
  
  // Get company names for context
  const companyNames = companies.map((c: any) => c.name || c.companyName || 'Unnamed').slice(0, 10);
  
  // Build context string with real data
  const appContext = `
INSURANCE AGENCY APP CONTEXT:

CURRENT AGENCY DATA:
- Total Companies: ${totalCompanies}
- Active Companies: ${activeCompanies}
- Total Tasks: ${totalTasks}
- Pending Tasks: ${pendingTasks}
- Completed Tasks: ${completedTasks}

SAMPLE COMPANIES IN SYSTEM:
${companyNames.map(name => `- ${name}`).join('\n')}

AVAILABLE AI-POWERED TASKS:
${aiTasks.map(task => `- ${task.taskName}: ${task.description}`).join('\n')}

WORKFLOW PHASES: Submission → Marketing → Proposal → Binding → Policy Check-In

TASK TYPES: AI-powered, Manual, Waiting, Approved

The system manages insurance workflows including:
- ACORD forms (125, 130) for commercial insurance applications
- Workers' Compensation renewals and submissions
- Marketing to carriers and underwriters
- Proposal generation and comparison
- Policy binding and certificate generation
- Policy check-in and verification
`;

  const systemPrompt = `You are an intelligent AI assistant for an insurance agency management system. You have REAL-TIME access to the agency's database including companies, tasks, and workflows.

${appContext}

Your capabilities include:
- Providing accurate counts and statistics about companies and tasks in the system
- Helping with insurance workflow tasks (ACORD forms, submissions, marketing, proposals, binding, policy check-in)
- Providing information about available AI-powered automation tasks
- Explaining insurance processes and best practices
- Assisting with task management and workflow optimization
- Generating insurance-related content like narratives, emails, and proposals

When asked about company or task counts, provide the actual numbers from the database. Be professional, knowledgeable about insurance processes, and focus on helping users manage their agency operations efficiently.`;

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
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