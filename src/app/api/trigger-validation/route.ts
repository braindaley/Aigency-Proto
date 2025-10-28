import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Helper function to validate task completion using AI with actual test criteria
async function validateTaskCompletion(messages: any[], testCriteria: string, taskName: string, taskDescription: string) {
  console.log('=== MANUAL VALIDATION TRIGGER ===');
  console.log('Task:', taskName);
  console.log('Test criteria:', testCriteria);

  // If no test criteria, return completed
  if (!testCriteria || testCriteria.trim() === '') {
    console.log('No test criteria defined - marking as completed');
    return { overallStatus: 'COMPLETED', missingCriteria: [] };
  }

  // Collect all documents and artifacts from the conversation
  const allDocuments: any[] = [];
  const allArtifacts: any[] = [];
  let conversationSummary = '';

  messages.forEach((msg: any) => {
    if (msg.documents && Array.isArray(msg.documents)) {
      allDocuments.push(...msg.documents);
    }
    if (msg.artifacts && Array.isArray(msg.artifacts)) {
      allArtifacts.push(...msg.artifacts);
    }
    conversationSummary += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content?.substring(0, 500)}...`;
  });

  console.log('Documents:', allDocuments.length, 'Artifacts:', allArtifacts.length);

  // Use Gemini to dynamically evaluate the test criteria
  const validationPrompt = `You are a task validation assistant. Your job is to evaluate whether a task has been completed successfully based on specific test criteria.

## Task Information
**Task Name:** ${taskName}
**Task Description:** ${taskDescription}

## Test Criteria (these must ALL be met)
${testCriteria}

## Conversation History
${conversationSummary}

## Uploaded Documents
${allDocuments.length > 0 ? allDocuments.map((doc, i) => {
  const content = doc.content || '';
  const preview = content.length > 2000 ? content.substring(0, 2000) + '...[truncated]' : content;
  return `Document ${i + 1}: ${doc.name || doc.filename || 'Unnamed'}\nFile type: ${doc.type || 'unknown'}\nContent:\n${preview}`;
}).join('\n\n') : 'No documents uploaded'}

## Created Artifacts
${allArtifacts.length > 0 ? allArtifacts.map((art, i) => `Artifact ${i + 1} (${art.type}): ${art.name}\nContent preview:\n${(art.content || '').substring(0, 500)}...`).join('\n\n') : 'No artifacts created'}

## CRITICAL Guidelines for Evaluation

**YOU MUST BE PRACTICAL, NOT LITERAL:**

- If a criterion says "X has been obtained" and the user uploaded a document containing X, mark it as MET
- If a criterion says "documents are verified/official" and the user uploaded appropriate documents, mark it as MET (don't require them to say "I verify these are official")
- If a criterion says "confirm that X" and X is evident in the uploaded files, mark it as MET (don't require them to write "I confirm")
- If a criterion asks for data spanning a time period and the uploaded file contains data for that period, mark it as MET

**Interpret criteria as action items, not verbal confirmations:**
- "Loss runs are verified and official" means → user uploaded loss run documents (MET if uploaded)
- "Confirmation that format is acceptable" means → format appears standard/reasonable (MET if .xlsx or .pdf)
- "No gaps in history" means → uploaded data covers the period (MET if years are present)
- "Data is current and up-to-date" means → uploaded recently or data is recent (MET if uploaded in this session)

**Only mark NOT_MET if:**
- No document was uploaded when one is required
- The uploaded document clearly doesn't contain the required information
- A specific data requirement is obviously missing from the uploaded content

## Your Task
Evaluate each criterion from the test criteria list and determine:
1. Whether it has been MET or NOT_MET
2. Provide specific evidence from the conversation, documents, or artifacts
3. Explain your reasoning

For each criterion, extract the individual bullet points and evaluate them separately.

Return your evaluation as a JSON object with this exact structure:
{
  "criteriaAssessment": [
    {
      "criterion": "The specific criterion text",
      "status": "MET" | "NOT_MET",
      "evidence": "Specific evidence from conversation/documents/artifacts that proves this",
      "explanation": "Clear explanation of why this criterion is met or not met"
    }
  ],
  "missingInformation": [
    "Specific information that is missing (if any criteria are NOT_MET)"
  ],
  "recommendations": [
    "Specific actionable recommendations for completing unmet criteria"
  ]
}

Be practical and fair. If the user has genuinely completed the work described in the criteria by uploading appropriate documents or data, mark it as MET.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const result = await model.generateContent(validationPrompt);
  const response = await result.response;
  const responseText = response.text();
  console.log('Gemini validation response:', responseText);

  // Parse the JSON response
  let validationData;
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;
    validationData = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Failed to parse Claude response as JSON:', parseError);
    // Fallback: assume not completed
    validationData = {
      criteriaAssessment: [{
        criterion: 'Task validation',
        status: 'NOT_MET',
        evidence: 'Unable to parse validation response',
        explanation: 'The validation system encountered an error. Please try again.'
      }],
      missingInformation: ['Validation system error'],
      recommendations: ['Please try validating again']
    };
  }

  // Calculate overall status
  const criteriaAssessment = validationData.criteriaAssessment || [];
  const metCount = criteriaAssessment.filter((c: any) => c.status === "MET").length;
  const totalCount = criteriaAssessment.length;

  let overallStatus: string;
  if (metCount === totalCount && totalCount > 0) {
    overallStatus = "COMPLETED";
  } else if (metCount > 0) {
    overallStatus = "PARTIALLY_COMPLETED";
  } else {
    overallStatus = "NOT_COMPLETED";
  }

  return {
    overallStatus,
    missingCriteria: validationData.missingInformation || []
  };
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

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId' },
        { status: 400 }
      );
    }

    console.log(`Manual validation trigger for task ${taskId}`);

    // Fetch task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Get testCriteria from the template if not on the task itself
    let testCriteria = task.testCriteria || '';

    if (!testCriteria && task.templateId) {
      console.log(`Fetching testCriteria from template: ${task.templateId}`);
      const templateDocRef = doc(db, 'tasks', task.templateId.toString());
      const templateDoc = await getDoc(templateDocRef);

      if (templateDoc.exists()) {
        const template = templateDoc.data();
        testCriteria = template.testCriteria || '';
        console.log(`Found testCriteria in template: ${testCriteria.substring(0, 100)}...`);
      }
    }

    // Get chat messages for this task
    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
    const chatSnapshot = await getDocs(chatQuery);
    
    const messages = chatSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${messages.length} messages in taskChats/${taskId}/messages`);
    messages.forEach((msg, idx) => {
      console.log(`Message ${idx}:`, {
        role: msg.role,
        contentLength: msg.content?.length,
        hasDocuments: !!msg.documents,
        documentsCount: msg.documents?.length || 0,
        timestamp: msg.timestamp
      });
    });
    
    const validationResult = await validateTaskCompletion(
      messages,
      testCriteria,
      task.taskName || '',
      task.description || ''
    );

    console.log('Manual validation result:', validationResult);

    // If task is completed, update status
    if (validationResult.overallStatus === 'COMPLETED') {
      await updateTaskStatus(taskId, 'completed');
      console.log(`Task ${taskId} manually marked as completed`);
    }

    return NextResponse.json({
      success: true,
      taskId,
      taskName: task.taskName,
      currentStatus: task.status,
      validationResult,
      messagesCount: messages.length,
      documentsFound: messages.reduce((acc, msg) => acc + (msg.documents?.length || 0), 0)
    });

  } catch (error) {
    console.error('Manual validation trigger error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
