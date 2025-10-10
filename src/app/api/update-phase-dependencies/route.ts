import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';

export async function POST() {
  try {
    console.log('Fetching workers-comp tasks...');

    // Get all workers-comp tasks
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('policyType', '==', 'workers-comp')
    );
    const tasksSnapshot = await getDocs(q);

    const tasks = tasksSnapshot.docs
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    console.log(`Found ${tasks.length} tasks`);

    // Find tasks with sortOrder 10, 17, 25, 31 and their predecessors
    const targetSortOrders = [10, 17, 25, 31];
    const updates: Array<{ taskId: string; taskName: string; sortOrder: number; previousTaskId: string; previousTaskName: string }> = [];

    for (const sortOrder of targetSortOrders) {
      const currentTask = tasks.find((t: any) => t.sortOrder === sortOrder);
      const previousTask = tasks.find((t: any) => t.sortOrder === sortOrder - 1);

      if (currentTask && previousTask) {
        updates.push({
          taskId: currentTask.id,
          taskName: (currentTask as any).taskName,
          sortOrder: (currentTask as any).sortOrder,
          previousTaskId: previousTask.id,
          previousTaskName: (previousTask as any).taskName
        });
        console.log(`Task ${sortOrder} (${(currentTask as any).taskName}) will depend on Task ${(previousTask as any).sortOrder} (${(previousTask as any).taskName})`);
      } else {
        console.warn(`Could not find task with sortOrder ${sortOrder} or ${sortOrder - 1}`);
      }
    }

    // Apply updates
    console.log('Applying updates...');
    const batch = writeBatch(db);

    for (const update of updates) {
      const taskRef = doc(db, 'tasks', update.taskId);
      batch.update(taskRef, {
        dependencies: [update.previousTaskId]
      });
    }

    await batch.commit();
    console.log('✅ Successfully updated task dependencies!');

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updates.length} tasks`,
      updates: updates.map(u => ({
        taskName: u.taskName,
        sortOrder: u.sortOrder,
        dependsOn: u.previousTaskName
      }))
    });

  } catch (error) {
    console.error('Error updating dependencies:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
