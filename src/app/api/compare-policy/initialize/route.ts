import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId' },
        { status: 400 }
      );
    }

    // Create a new compare policy workflow
    const workflowRef = await addDoc(collection(db, 'comparePolicyWorkflows'), {
      companyId,
      phase: 'upload',
      status: 'in_progress',
      uploadedDocuments: {},
      chatHistory: [
        {
          role: 'assistant',
          content: "Let's compare your Workers' Compensation policy documents! Please upload:\n\n1. **ACORD 130** - The ACORD 130 form\n2. **Issued Policy** - The final policy document from the carrier\n\nYou can drag and drop both files at once, or click the upload button below.",
          timestamp: Timestamp.now(),
        },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, workflowId: workflowRef.id });
  } catch (error) {
    console.error('Error initializing compare policy workflow:', error);
    return NextResponse.json(
      { error: 'Failed to initialize workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
