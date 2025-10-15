import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { taskId, systemPrompt, testCriteria } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    const taskRef = doc(db, 'companyTasks', taskId);
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (systemPrompt) updates.systemPrompt = systemPrompt;
    if (testCriteria) updates.testCriteria = testCriteria;

    await updateDoc(taskRef, updates);

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      updates
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
