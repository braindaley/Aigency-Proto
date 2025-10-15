import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { DataService } from '@/lib/data-service';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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
  const pendingTasks = companyTasks.filter((task: any) => task.status === 'pending').length;
  const completedTasks = companyTasks.filter((task: any) => task.status === 'completed').length;

  // Get company names and basic info for context
  const companyList = companies.slice(0, 20).map((c: any) => ({
    name: c.name || c.companyName || 'Unnamed',
    id: c.id,
    description: c.description || '',
    website: c.website || ''
  }));

  // Fetch all documents and artifacts from all companies
  const allDocuments: any[] = [];
  const allArtifacts: any[] = [];

  for (const company of companies) {
    try {
      // Get documents for this company
      const docsRef = collection(db, `companies/${company.id}/documents`);
      const docsSnapshot = await getDocs(docsRef);

      docsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        allDocuments.push({
          companyId: company.id,
          companyName: company.name,
          documentId: doc.id,
          name: data.name,
          type: data.type,
          category: data.category,
          uploadedAt: data.uploadedAt,
          url: data.url
        });
      });

      // Get artifacts for this company
      const artifactsRef = collection(db, `companies/${company.id}/artifacts`);
      const artifactsSnapshot = await getDocs(artifactsRef);

      artifactsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        allArtifacts.push({
          companyId: company.id,
          companyName: company.name,
          artifactId: doc.id,
          name: data.name,
          type: data.type,
          data: data.data,
          description: data.description,
          tags: data.tags,
          createdAt: data.createdAt
        });
      });
    } catch (error) {
      console.error(`Error fetching documents/artifacts for company ${company.id}:`, error);
    }
  }

  // Build context string with real data including documents
  const appContext = `
INSURANCE AGENCY APP CONTEXT:

CURRENT AGENCY DATA:
- Total Companies: ${totalCompanies}
- Active Companies: ${activeCompanies}
- Total Tasks: ${totalTasks}
- Pending Tasks: ${pendingTasks}
- Completed Tasks: ${completedTasks}
- Total Documents: ${allDocuments.length}
- Total Artifacts: ${allArtifacts.length}

COMPANIES IN SYSTEM (showing first 20):
${companyList.map(c => `- ${c.name} (ID: ${c.id})${c.description ? `: ${c.description}` : ''}`).join('\n')}

DOCUMENTS AVAILABLE:
${allDocuments.slice(0, 50).map(d => `- ${d.companyName}: ${d.name} (${d.category || 'uncategorized'})`).join('\n')}
${allDocuments.length > 50 ? `... and ${allDocuments.length - 50} more documents` : ''}

ARTIFACTS AVAILABLE:
${allArtifacts.slice(0, 30).map(a => `- ${a.companyName}: ${a.name}${a.description ? ` - ${a.description}` : ''}`).join('\n')}
${allArtifacts.length > 30 ? `... and ${allArtifacts.length - 30} more artifacts` : ''}

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

  const systemPrompt = `You are an intelligent AI assistant for an insurance agency management system. You have REAL-TIME access to the agency's database including companies, tasks, workflows, documents, and artifacts.

${appContext}

Your capabilities include:
- Answering questions about specific companies and their data in the system
- Providing information about documents uploaded for each company
- Accessing artifacts (processed data, forms, etc.) associated with companies
- Providing accurate counts and statistics about companies, tasks, and documents
- Helping with insurance workflow tasks (ACORD forms, submissions, marketing, proposals, binding, policy check-in)
- Providing information about available AI-powered automation tasks
- Explaining insurance processes and best practices
- Assisting with task management and workflow optimization
- Generating insurance-related content like narratives, emails, and proposals

When asked about specific companies:
- Reference their name, documents, and any relevant data from the context
- Mention document names and types that are available
- Provide summaries of artifacts if asked

When asked about company or task counts, provide the actual numbers from the database. Be professional, knowledgeable about insurance processes, and focus on helping users manage their agency operations efficiently.`;

    const result = await streamText({
      model: google('gemini-2.5-flash'),
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