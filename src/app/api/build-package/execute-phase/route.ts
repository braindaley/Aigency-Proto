import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, Timestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// Set maxDuration to allow longer processing
export const maxDuration = 60;

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

    // Delete old artifacts for tasks 4-8 before regenerating
    console.log('Deleting old artifacts for tasks 4-8...');
    for (const taskId of aiTaskIds) {
      if (!taskId) continue;

      try {
        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
        const artifactsSnapshot = await getDocs(artifactsQuery);

        for (const artifactDoc of artifactsSnapshot.docs) {
          await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactDoc.id));
          console.log(`Deleted old artifact for task ${taskId}`);
        }
      } catch (error) {
        console.error(`Error deleting artifacts for task ${taskId}:`, error);
      }
    }

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

    // Trigger only the FIRST AI task (task 4)
    // Each task will trigger the next one when it completes (handled in ai-task-completion)
    if (aiTaskIds.length > 0 && aiTaskIds[0]) {
      const firstTaskId = aiTaskIds[0];
      console.log(`Triggering first task: ${firstTaskId}`);

      // Update task status to "Needs attention"
      const taskRef = doc(db, 'companyTasks', firstTaskId);
      await updateDoc(taskRef, {
        status: 'Needs attention',
        updatedAt: Timestamp.now(),
      });

      // Trigger the first task (MUST await to prevent serverless termination)
      try {
        const taskResponse = await fetch(`${req.nextUrl.origin}/api/ai-task-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: firstTaskId,
            companyId,
            workflowId, // Pass workflowId so it can trigger next task and update workflow
          }),
        });

        if (!taskResponse.ok) {
          const errorText = await taskResponse.text();
          console.error('❌ First task failed:', errorText);
        } else {
          const result = await taskResponse.json();
          console.log('✅ First task completed:', result);
        }
      } catch (error) {
        console.error('❌ Error triggering first task:', error);
      }
    }

    return NextResponse.json({ success: true, message: 'Processing started' });
  } catch (error) {
    console.error('Error executing workflow phase:', error);
    return NextResponse.json(
      { error: 'Failed to execute phase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
