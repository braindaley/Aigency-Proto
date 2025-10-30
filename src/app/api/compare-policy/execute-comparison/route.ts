import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a Workers Compensation Insurance Document Analyst AI. Your primary function is to compare issued policies against their corresponding proposals/binders to identify discrepancies, changes, and compliance issues.

CORE RESPONSIBILITIES:
- Extract and compare key policy elements between proposals and issued policies
- Identify material changes that may affect coverage or pricing
- Flag potential errors or inconsistencies
- Provide clear, actionable analysis for underwriters and brokers

KEY COMPARISON AREAS:
1. Coverage Details: Limits, deductibles, territory codes
2. Premium Information: Base premiums, experience mods, final premiums
3. Classification Codes: Job classifications and corresponding rates
4. Policy Terms: Effective dates, policy periods, cancellation terms
5. Endorsements: Added or removed coverage modifications
6. Payroll Projections: Estimated vs. actual payroll by classification
7. Safety Programs: Credits, discounts, and loss control measures

ANALYSIS STANDARDS:
- Flag any variance >5% in premium calculations
- Highlight all classification code changes
- Note effective date discrepancies
- Identify missing or added endorsements
- Report coverage limit modifications

OUTPUT REQUIREMENTS:
- Categorize findings by severity (Critical, Moderate, Minor)
- Provide specific line references for each discrepancy
- Include financial impact calculations where applicable
- Suggest corrective actions for identified issues

CRITICAL REQUIREMENT - YOU MUST GENERATE AN ARTIFACT:
For this task to be considered complete, you MUST create a document wrapped in <artifact> tags.
The artifact should be a complete, professional document that fulfills the comparison requirements.

Example format:
<artifact>
# Policy Comparison Analysis

## Executive Summary
[Brief overview of findings and key discrepancies]

## Critical Findings
[List critical issues with financial impact]

## Moderate Findings
[List moderate issues]

## Minor Findings
[List minor discrepancies]

## Recommendations
[Actionable steps to address issues]

## Detailed Comparison Tables
[Tables showing side-by-side comparisons]
</artifact>

Your analysis should be thorough, accurate, and immediately actionable for insurance professionals.`;

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 COMPARE-POLICY: Request received`);

  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error(`[${timestamp}] ❌ COMPARE-POLICY: Google AI API key not configured`);
      throw new Error('Google AI API key is not configured');
    }

    const { workflowId } = await request.json();

    console.log(`[${timestamp}] 📋 COMPARE-POLICY: Processing workflowId=${workflowId}`);

    if (!workflowId) {
      console.error(`[${timestamp}] ❌ COMPARE-POLICY: Missing workflowId`);
      return NextResponse.json(
        { error: 'Missing workflowId' },
        { status: 400 }
      );
    }

    // Fetch the workflow details
    const workflowRef = doc(db, 'comparePolicyWorkflows', workflowId);
    const workflowDoc = await getDoc(workflowRef);

    if (!workflowDoc.exists()) {
      console.error(`[${timestamp}] ❌ COMPARE-POLICY: Workflow not found: ${workflowId}`);
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflow = workflowDoc.data();
    const { companyId, uploadedDocuments } = workflow;

    console.log(`[${timestamp}] 📝 COMPARE-POLICY: Workflow loaded for company: ${companyId}`);

    // Fetch the uploaded documents
    const proposalDocId = uploadedDocuments.proposal;
    const policyDocId = uploadedDocuments.issuedPolicy;

    if (!proposalDocId || !policyDocId) {
      console.error(`[${timestamp}] ❌ COMPARE-POLICY: Missing required documents`);
      return NextResponse.json(
        { error: 'Missing required documents' },
        { status: 400 }
      );
    }

    // Get document details
    const proposalDoc = await getDoc(doc(db, `companies/${companyId}/documents`, proposalDocId));
    const policyDoc = await getDoc(doc(db, `companies/${companyId}/documents`, policyDocId));

    if (!proposalDoc.exists() || !policyDoc.exists()) {
      console.error(`[${timestamp}] ❌ COMPARE-POLICY: Documents not found in database`);
      return NextResponse.json(
        { error: 'Documents not found' },
        { status: 404 }
      );
    }

    const proposalData = proposalDoc.data();
    const policyData = policyDoc.data();

    console.log(`[${timestamp}] 📄 COMPARE-POLICY: Documents loaded:
      - Proposal: ${proposalData.name}
      - Policy: ${policyData.name}`);

    // Get enhanced context with all company data
    const context = await DataService.getEnhancedAITaskContext(companyId, 'compare-policy');

    console.log(`[${timestamp}] 📊 COMPARE-POLICY: Context loaded:
      - Documents: ${context.allDocuments.length}
      - Artifacts: ${context.allArtifacts.length}
      - Completed tasks: ${context.completedTasks.length}`);

    // Build comprehensive prompt
    const fullPrompt = `${SYSTEM_PROMPT}

AVAILABLE CONTEXT:
${context.relevantContent}

DOCUMENTS TO COMPARE:
1. Proposal/Binder Document: ${proposalData.name}
2. Issued Policy Document: ${policyData.name}

TASK:
Please perform a comprehensive comparison between the proposal/binder and the issued policy. Analyze all available data from the company's documents and artifacts to identify:

1. **Coverage Changes**: Any differences in coverage limits, deductibles, or territory
2. **Premium Variances**: Any changes in quoted vs. final premium (flag if >5%)
3. **Classification Changes**: Any modifications to job classifications or rates
4. **Policy Term Discrepancies**: Effective dates, expiration dates, cancellation terms
5. **Endorsement Changes**: Added, removed, or modified endorsements
6. **Payroll Adjustments**: Differences between estimated and actual payroll
7. **Safety Credits/Discounts**: Changes in loss control measures or credits

Generate a comprehensive comparison report wrapped in <artifact> tags.`;

    // Initialize Google AI
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log(`[${timestamp}] 🔮 COMPARE-POLICY: Generating AI analysis...`);
    const aiResult = await model.generateContent(fullPrompt);
    const response = await aiResult.response;
    const fullText = response.text();
    console.log(`[${timestamp}] ✅ COMPARE-POLICY: AI analysis generated (${fullText.length} characters)`);

    // Extract artifact content
    const artifactMatch = fullText.match(/<artifact>([\s\S]*?)<\/artifact>/);
    const artifactContent = artifactMatch ? artifactMatch[1].trim() : null;
    const hasArtifact = artifactContent && artifactContent.length > 100;

    // Extract any text before/after the artifact tags for the chat message
    let chatContent = fullText;
    if (hasArtifact) {
      chatContent = fullText.replace(/<artifact>[\s\S]*?<\/artifact>/g, '').trim();
      if (!chatContent || chatContent.length < 20) {
        chatContent = "I've completed the policy comparison analysis. You can view the detailed report on the right side of the screen.";
      }
    }

    // Add completion message to chat
    const completionMessage = {
      role: 'assistant',
      content: chatContent,
      timestamp: Timestamp.now(),
      isAIGenerated: true,
      usedDocuments: context.allDocuments.length,
      usedArtifacts: context.allArtifacts.length,
    };

    const updatedChatHistory = [
      ...(workflow.chatHistory || []),
      completionMessage,
    ];

    // Save artifact if one was generated
    if (hasArtifact) {
      try {
        console.log(`[${timestamp}] 💾 COMPARE-POLICY: Saving artifact to database...`);

        const artifactData = {
          name: 'Policy Comparison Analysis',
          type: 'text',
          data: artifactContent,
          description: 'AI-generated policy comparison analysis',
          tags: ['policy-comparison', 'ai-generated', 'analysis'],
          renewalType: 'workers-comp',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const docRef = await addDoc(artifactsRef, artifactData);
        console.log(`[${timestamp}] ✅ COMPARE-POLICY: Artifact saved to database: ${docRef.id}`);
      } catch (error) {
        console.error(`[${timestamp}] ❌ COMPARE-POLICY: Failed to save artifact:`, error);
      }
    }

    // Update workflow to complete
    await updateDoc(workflowRef, {
      phase: 'complete',
      status: 'completed',
      comparisonResult: artifactContent || fullText,
      chatHistory: updatedChatHistory,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`[${timestamp}] 🏁 COMPARE-POLICY: Workflow completed successfully`);

    return NextResponse.json({
      success: true,
      hasArtifact,
      documentsUsed: context.allDocuments.length,
      artifactsUsed: context.allArtifacts.length,
    });

  } catch (error) {
    console.error(`[${timestamp}] ❌ COMPARE-POLICY ERROR:`, error);
    return NextResponse.json(
      { error: 'Failed to execute comparison', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
