import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { workflowId, uploadedDocuments } = await req.json();

    if (!workflowId || !uploadedDocuments) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const workflowRef = doc(db, 'comparePolicyWorkflows', workflowId);
    const workflowDoc = await getDoc(workflowRef);

    if (!workflowDoc.exists()) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowData = workflowDoc.data();

    console.log('📤 Upload-complete received:', {
      workflowId,
      uploadedDocuments,
      hasProposal: !!uploadedDocuments.proposal,
      hasIssuedPolicy: !!uploadedDocuments.issuedPolicy
    });

    // Check if both required documents are uploaded
    const allDocsUploaded =
      uploadedDocuments.proposal &&
      uploadedDocuments.issuedPolicy;

    console.log('✓ All docs uploaded:', allDocsUploaded);

    // Add confirmation message
    const newMessage = {
      role: 'assistant',
      content: allDocsUploaded
        ? "Perfect! I've received both documents. I'm now analyzing and comparing:\n\n✓ ACORD 130 form\n✓ Issued Policy document\n\nThis may take a moment as I carefully review coverage details, premiums, classifications, and endorsements to identify any discrepancies."
        : "Documents uploaded! Please upload the remaining document to continue.",
      timestamp: Timestamp.now(),
    };

    const updatedChatHistory = [...(workflowData.chatHistory || []), newMessage];

    // Update workflow
    await updateDoc(workflowRef, {
      uploadedDocuments: {
        ...workflowData.uploadedDocuments,
        ...uploadedDocuments,
      },
      chatHistory: updatedChatHistory,
      phase: allDocsUploaded ? 'processing' : 'upload',
      updatedAt: Timestamp.now(),
    });

    // If all documents uploaded, trigger comparison
    if (allDocsUploaded) {
      console.log('🚀 Triggering execute-comparison endpoint...');

      try {
        // IMPORTANT: Await the fetch so it completes before the serverless function terminates
        const comparisonResponse = await fetch(`${req.nextUrl.origin}/api/compare-policy/execute-comparison`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId }),
        });

        if (!comparisonResponse.ok) {
          const errorText = await comparisonResponse.text();
          console.error('❌ Execute-comparison failed:', errorText);
        } else {
          const result = await comparisonResponse.json();
          console.log('✅ Execute-comparison completed:', result);
        }
      } catch (error) {
        console.error('❌ Error triggering execute-comparison:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing uploads:', error);
    return NextResponse.json(
      { error: 'Failed to process uploads', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
