import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { companyTaskId, templateTaskId, conversation } = await request.json();

    if (!companyTaskId || !templateTaskId || !conversation) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fetch the template task to get test criteria
    const templateTaskRef = doc(db, 'tasks', templateTaskId);
    const templateTaskDoc = await getDoc(templateTaskRef);

    if (!templateTaskDoc.exists()) {
      return NextResponse.json(
        { error: 'Template task not found' },
        { status: 404 }
      );
    }

    const templateTask = templateTaskDoc.data();
    const testCriteria = templateTask.testCriteria;

    console.log('=== DYNAMIC VALIDATION ===');
    console.log('Task:', templateTask.taskName);
    console.log('Test criteria:', testCriteria);

    // If no test criteria, return success (task doesn't require validation)
    if (!testCriteria || testCriteria.trim() === '') {
      console.log('No test criteria defined - skipping validation');
      return NextResponse.json({
        success: true,
        validation: {
          overallStatus: 'COMPLETED',
          completionPercentage: 100,
          criteriaAssessment: [],
          summary: 'This task does not have validation criteria defined.',
          recommendations: [],
          nextSteps: 'Continue to the next task.'
        },
        taskInfo: {
          templateTaskId,
          companyTaskId,
          taskName: templateTask.taskName,
          taskDescription: templateTask.description
        }
      });
    }

    // Collect all documents and artifacts from the conversation
    const allDocuments: any[] = [];
    const allArtifacts: any[] = [];
    let conversationSummary = '';

    conversation.forEach((msg: any, idx: number) => {
      if (msg.documents && Array.isArray(msg.documents)) {
        allDocuments.push(...msg.documents);
      }
      if (msg.artifacts && Array.isArray(msg.artifacts)) {
        allArtifacts.push(...msg.artifacts);
      }
      conversationSummary += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content?.substring(0, 500)}...`;
    });

    console.log('Documents:', allDocuments.length, 'Artifacts:', allArtifacts.length);

    // Use Claude to dynamically evaluate the test criteria
    const validationPrompt = `You are a task validation assistant. Your job is to evaluate whether a task has been completed successfully based on specific test criteria.

## Task Information
**Task Name:** ${templateTask.taskName}
**Task Description:** ${templateTask.description}

## Test Criteria (these must ALL be met)
${testCriteria}

## Conversation History
${conversationSummary}

## Uploaded Documents
${allDocuments.length > 0 ? allDocuments.map((doc, i) => `Document ${i + 1}: ${doc.name || 'Unnamed'} - ${(doc.content || '').substring(0, 300)}...`).join('\n') : 'No documents uploaded'}

## Created Artifacts
${allArtifacts.length > 0 ? allArtifacts.map((art, i) => `Artifact ${i + 1} (${art.type}): ${art.name} - ${(art.content || '').substring(0, 300)}...`).join('\n') : 'No artifacts created'}

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

Be thorough but fair. If the user has genuinely completed the work described in the criteria, mark it as MET.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: validationPrompt
        }
      ]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Claude validation response:', responseText);

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
    const completionPercentage = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;

    let overallStatus: string;
    if (metCount === totalCount && totalCount > 0) {
      overallStatus = "COMPLETED";
    } else if (metCount > 0) {
      overallStatus = "PARTIALLY_COMPLETED";
    } else {
      overallStatus = "NOT_COMPLETED";
    }

    // Generate summary
    let summary: string;
    if (overallStatus === "COMPLETED") {
      summary = `**Task completed successfully!** All ${totalCount} criteria have been met.`;
    } else {
      const unmetCriteria = criteriaAssessment.filter((c: any) => c.status === "NOT_MET");
      summary = `**Task validation:** ${metCount} of ${totalCount} criteria met.\n\n**Still needed:**\n${unmetCriteria.map((c: any) => `• ${c.criterion}`).join('\n')}`;
    }

    const validationResult = {
      overallStatus,
      completionPercentage,
      criteriaAssessment,
      summary,
      missingInformation: validationData.missingInformation || [],
      recommendations: validationData.recommendations || [],
      nextSteps: overallStatus === "COMPLETED"
        ? "All criteria have been satisfied. You can proceed to the next task."
        : "Please address the missing criteria listed above."
    };

    return NextResponse.json({
      success: true,
      validation: validationResult,
      taskInfo: {
        templateTaskId,
        companyTaskId,
        taskName: templateTask.taskName,
        taskDescription: templateTask.description
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate task completion' },
      { status: 500 }
    );
  }
}