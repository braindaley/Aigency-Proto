import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { taskId, status } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'Missing taskId or status' },
        { status: 400 }
      );
    }

    const taskRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskRef, {
      status,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      taskId,
      status
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}
