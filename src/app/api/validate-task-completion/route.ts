import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

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

    if (!testCriteria) {
      return NextResponse.json(
        { error: 'No test criteria defined for this task template' },
        { status: 400 }
      );
    }

    // Prepare the conversation text
    const conversationText = conversation
      .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    // Collect all documents from the conversation
    const allDocuments: any[] = [];
    conversation.forEach((msg: any) => {
      if (msg.documents && Array.isArray(msg.documents)) {
        allDocuments.push(...msg.documents);
      }
    });

    // Prepare document contents for analysis
    let documentAnalysis = '';
    if (allDocuments.length > 0) {
      documentAnalysis = '\n\nDOCUMENTS PROVIDED:\n';
      allDocuments.forEach((doc, index) => {
        documentAnalysis += `\nDocument ${index + 1}: ${doc.filename} (${doc.type})\n`;
        documentAnalysis += `Content: ${doc.content}\n`;
        documentAnalysis += '---\n';
      });
    }

    // Create the validation prompt with timestamp to prevent caching
    const validationPrompt = `
TIMESTAMP: ${new Date().toISOString()}

You are a task completion validator for insurance workflows. 

IMPORTANT: Ignore any previous conversation context or validation history. This is a fresh, independent evaluation.

Your job is to analyze ONLY the current conversation AND any uploaded documents to determine if the task has been completed according to the SPECIFIC success criteria listed below.

TASK INFORMATION:
- Task Name: ${templateTask.taskName}
- Task Description: ${templateTask.description}
- Task Phase: ${templateTask.phase}
- Task Type: ${templateTask.tag}

SUCCESS CRITERIA TO EVALUATE AGAINST:
${testCriteria}

CONVERSATION TO EVALUATE:
${conversationText}${documentAnalysis}

VALIDATION RULES - FOLLOW THESE EXACTLY:

FOR CRITERION "Employee count data has been collected and documented":
- If there is a spreadsheet/document with employee names and job titles → MARK AS MET
- Do NOT require additional details beyond basic employee information

FOR CRITERION "Job descriptions for all roles have been gathered":  
- If each employee has ANY job description text in the document → MARK AS MET
- Do NOT require lengthy detailed descriptions - ANY description counts as "gathered"

FOR CRITERION "High-risk roles have been specifically identified and documented":
- If any roles are marked as "High" risk or have risk assessments → MARK AS MET  
- Do NOT require detailed safety protocols - identification is sufficient

ABSOLUTELY FORBIDDEN:
- Do NOT ask for annual salary conversions unless criteria explicitly requires it
- Do NOT ask for specific weight ranges, frequencies, or detailed safety protocols
- Do NOT add requirements beyond the 3 criteria listed
- Do NOT say data is "insufficient" if it meets the basic criteria above
- Do NOT reference ACORD forms or insurance requirements beyond the criteria

If the uploaded document contains employee data with job descriptions and risk identification, you MUST mark all criteria as MET and status as COMPLETED.

Format your response as valid JSON using proper markdown formatting within text fields for better readability:

{
  "overallStatus": "COMPLETED" | "PARTIALLY_COMPLETED" | "NOT_COMPLETED",
  "completionPercentage": number (0-100),
  "criteriaAssessment": [
    {
      "criterion": "The specific criterion text",
      "status": "MET" | "PARTIALLY_MET" | "NOT_MET",
      "evidence": "Specific evidence from the conversation OR uploaded documents that supports this assessment",
      "explanation": "Detailed explanation of the assessment, referencing both conversation and documents where relevant"
    }
  ],
  "summary": "Overall summary of the task completion status. Use **bold text** for important points and separate paragraphs with proper line breaks.",
  "recommendations": [
    "Specific actionable recommendations for completing missing elements. Use **bold text** for key items and bullet points where appropriate."
  ],
  "nextSteps": "Suggested next steps to fully complete the task. Use **bold text** for action items and separate different steps with line breaks."
}

Be thorough, objective, and specific in your analysis. Base your assessment on what is clearly evident in BOTH the conversation AND any uploaded documents. Documents often contain the primary deliverables and should be given appropriate weight in the assessment.
`;

    // Debug logging
    console.log('=== VALIDATION DEBUG ===');
    console.log('Template task criteria:', testCriteria);
    console.log('Document count:', allDocuments.length);
    console.log('Validation prompt length:', validationPrompt.length);
    console.log('First 500 chars of prompt:', validationPrompt.substring(0, 500));
    
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(validationPrompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON response
    let validationResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', text);
      
      // Fallback response if JSON parsing fails
      validationResult = {
        overallStatus: 'PARTIALLY_COMPLETED',
        completionPercentage: 50,
        criteriaAssessment: [],
        summary: 'Unable to parse detailed assessment from AI response.',
        recommendations: ['Please review the task requirements and ensure all criteria are met.'],
        nextSteps: 'Manual review recommended due to parsing error.',
        rawResponse: text
      };
    }

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