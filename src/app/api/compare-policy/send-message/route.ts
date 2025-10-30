import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { workflowId, message } = await req.json();

    if (!workflowId || !message) {
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
    const updatedChatHistory = [...(workflowData.chatHistory || []), message];

    await updateDoc(workflowRef, {
      chatHistory: updatedChatHistory,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
