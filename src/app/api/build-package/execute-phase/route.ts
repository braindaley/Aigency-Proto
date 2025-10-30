import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { workflowId } = await req.json();

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Missing workflowId' },
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
    const { taskIds, companyId } = workflowData;

    // Tasks 4-8 (indices 3-7) are the AI tasks to execute
    const aiTaskIds = taskIds.slice(3, 8);

    // Update task 1-3 status to Complete (document upload tasks)
    for (let i = 0; i < 3; i++) {
      const taskId = taskIds[i];
      if (taskId) {
        const taskRef = doc(db, 'companyTasks', taskId);
        await updateDoc(taskRef, {
          status: 'Complete',
          updatedAt: Timestamp.now(),
        });
      }
    }

    // Trigger AI task completion for tasks 4-8 sequentially
    // We'll use the existing AI task completion system
    for (const taskId of aiTaskIds) {
      if (!taskId) continue;

      try {
        // Update task status to "Needs attention" to trigger processing
        const taskRef = doc(db, 'companyTasks', taskId);
        await updateDoc(taskRef, {
          status: 'Needs attention',
          updatedAt: Timestamp.now(),
        });

        // Call the AI task completion endpoint
        const response = await fetch(`${req.nextUrl.origin}/api/ai-task-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            companyId,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to execute task ${taskId}:`, await response.text());
        } else {
          // Add chat message when task completes
          const taskDoc = await getDoc(taskRef);
          const taskData = taskDoc.data();

          const completionMessage = {
            role: 'assistant',
            content: `✓ ${taskData?.taskName || 'Task'} completed`,
            timestamp: Timestamp.now(),
          };

          const workflowSnapshot = await getDoc(workflowRef);
          const currentWorkflowData = workflowSnapshot.data();
          const updatedChatHistory = [
            ...(currentWorkflowData?.chatHistory || []),
            completionMessage,
          ];

          await updateDoc(workflowRef, {
            chatHistory: updatedChatHistory,
            updatedAt: Timestamp.now(),
          });
        }
      } catch (error) {
        console.error(`Error executing task ${taskId}:`, error);
      }
    }

    // Update workflow to review phase after all tasks complete
    const reviewMessage = {
      role: 'assistant',
      content: "Your submission package is ready! Review the generated documents on the right side. You can download any document individually. When you're ready, we can proceed to the next steps.",
      timestamp: Timestamp.now(),
    };

    const finalWorkflowSnapshot = await getDoc(workflowRef);
    const finalWorkflowData = finalWorkflowSnapshot.data();
    const finalChatHistory = [
      ...(finalWorkflowData?.chatHistory || []),
      reviewMessage,
    ];

    await updateDoc(workflowRef, {
      phase: 'review',
      chatHistory: finalChatHistory,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error executing workflow phase:', error);
    return NextResponse.json(
      { error: 'Failed to execute phase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
