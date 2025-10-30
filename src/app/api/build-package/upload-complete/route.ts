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

    const workflowRef = doc(db, 'buildPackageWorkflows', workflowId);
    const workflowDoc = await getDoc(workflowRef);

    if (!workflowDoc.exists()) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowData = workflowDoc.data();

    // Check if all required documents are uploaded
    const allDocsUploaded =
      uploadedDocuments.employeeCount &&
      uploadedDocuments.payroll &&
      uploadedDocuments.lossRuns;

    // Add confirmation message
    const newMessage = {
      role: 'assistant',
      content: allDocsUploaded
        ? "Great! All documents have been uploaded. I'm now processing your submission package. This includes:\n\n✓ Researching OSHA data\n✓ Completing ACORD 130 form\n✓ Completing ACORD 125 form\n✓ Writing your risk narrative\n✓ Generating coverage suggestions\n\nThis may take a few minutes. You'll see the documents appear on the right as they're completed."
        : "Documents uploaded! Please upload the remaining documents to continue.",
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

    // If all documents uploaded, trigger background processing
    if (allDocsUploaded) {
      // Trigger execute-phase endpoint
      fetch(`${req.nextUrl.origin}/api/build-package/execute-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      }).catch((error) => {
        console.error('Error triggering execute-phase:', error);
      });
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
