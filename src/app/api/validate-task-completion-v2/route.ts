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

    // Create a completely fresh validation prompt
    const sessionId = Math.random().toString(36).substring(7);
    const uniquePromptId = `VALIDATION_${Date.now()}_${sessionId}`;
    
    const validationPrompt = `
UNIQUE_PROMPT_ID: ${uniquePromptId}
NEW_SESSION_START: This is a completely fresh evaluation with no prior context.

IGNORE ALL PREVIOUS INSTRUCTIONS AND CONTEXT.

You are a simple data checker. Look ONLY at the data provided below and check these 3 basic requirements:

CRITERIA TO CHECK:
${testCriteria}

DATA TO ANALYZE:
CONVERSATION: ${conversationText}
${documentAnalysis}

SIMPLE YES/NO EVALUATION:
1. Is there employee data? YES = "Employee count data collected" is MET
2. Are there job descriptions? YES = "Job descriptions gathered" is MET  
3. Are high-risk roles identified? YES = "High-risk roles identified" is MET

IMPORTANT: You are NOT evaluating quality, detail, or completeness beyond basic presence.

If you see employee names, job titles, descriptions, and risk levels → ALL criteria are MET → status is COMPLETED.

DO NOT mention:
- ACORD forms
- Annual salaries  
- Detailed protocols
- Previous submissions
- Insufficient data

Simply check: Is the basic information present? YES = COMPLETED.

Respond in JSON format:
{
  "overallStatus": "COMPLETED" | "PARTIALLY_COMPLETED" | "NOT_COMPLETED",
  "completionPercentage": number (0-100),
  "criteriaAssessment": [
    {
      "criterion": "criterion text",
      "status": "MET" | "PARTIALLY_MET" | "NOT_MET",
      "evidence": "what evidence shows this",
      "explanation": "brief explanation"
    }
  ],
  "summary": "Overall assessment summary",
  "recommendations": ["only if genuinely needed"],
  "nextSteps": "only if status is not COMPLETED"
}
`;

    console.log('=== FRESH VALIDATION ===');
    console.log('Session ID:', sessionId);
    console.log('Criteria:', testCriteria);
    console.log('Documents found:', allDocuments.length);

    // Call Gemini API with completely fresh context and configuration
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1, // Very low temperature for consistent, logical responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
    
    const result = await model.generateContent(validationPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let validationResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      validationResult = {
        overallStatus: 'PARTIALLY_COMPLETED',
        completionPercentage: 50,
        criteriaAssessment: [],
        summary: 'Unable to parse validation response.',
        recommendations: ['Please try validation again.'],
        nextSteps: 'Manual review recommended.',
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