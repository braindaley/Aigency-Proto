import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId' },
        { status: 400 }
      );
    }

    // Get the task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() };

    // Check dependencies status
    const dependencies = (task as any).dependencies || [];
    const dependencyStatus = [];

    for (const depId of dependencies) {
      // Try to find by document ID first
      let depDocRef = doc(db, 'companyTasks', depId);
      let depSnapshot = await getDoc(depDocRef);

      // If not found by document ID, try by template ID
      if (!depSnapshot.exists()) {
        const tasksRef = collection(db, 'companyTasks');
        const querySnapshot = await getDocs(tasksRef);

        const matchingTask = querySnapshot.docs.find(taskDoc => {
          const taskData = taskDoc.data();
          return (taskData.templateId === depId || String(taskData.templateId) === depId) &&
                 taskData.companyId === (task as any).companyId;
        });

        if (matchingTask) {
          depSnapshot = matchingTask;
        }
      }

      if (depSnapshot && depSnapshot.exists()) {
        const depData = depSnapshot.data();
        dependencyStatus.push({
          id: depId,
          foundAs: depSnapshot.id,
          status: depData.status,
          taskName: depData.taskName,
          isCompleted: depData.status === 'completed'
        });
      } else {
        dependencyStatus.push({
          id: depId,
          notFound: true
        });
      }
    }

    // Check for messages in taskChats
    const messagesRef = collection(db, 'taskChats', taskId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    return NextResponse.json({
      task: {
        id: task.id,
        taskName: (task as any).taskName,
        status: (task as any).status,
        tag: (task as any).tag,
        phase: (task as any).phase,
        dependencies: (task as any).dependencies || [],
        templateId: (task as any).templateId,
        testCriteria: (task as any).testCriteria,
        systemPrompt: (task as any).systemPrompt
      },
      dependencyStatus,
      allDependenciesCompleted: dependencyStatus.every(dep => dep.isCompleted === true),
      hasMessages: messagesSnapshot.size > 0,
      messageCount: messagesSnapshot.size
    });

  } catch (error) {
    console.error('Debug task error:', error);
    return NextResponse.json(
      { error: 'Failed to debug task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
