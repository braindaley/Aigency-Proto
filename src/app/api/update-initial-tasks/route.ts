import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

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

    // Find tasks with sortOrder 1, 2, 3
    const targetSortOrders = [1, 2, 3];
    const updates: Array<{ taskId: string; taskName: string; sortOrder: number }> = [];

    for (const sortOrder of targetSortOrders) {
      const task = tasks.find((t: any) => t.sortOrder === sortOrder);

      if (task) {
        updates.push({
          taskId: task.id,
          taskName: (task as any).taskName,
          sortOrder: (task as any).sortOrder
        });
        console.log(`Task ${sortOrder} (${(task as any).taskName}) - removing dependencies`);
      } else {
        console.warn(`Could not find task with sortOrder ${sortOrder}`);
      }
    }

    // Apply updates - set dependencies to empty array
    console.log('Applying updates...');
    const batch = writeBatch(db);

    for (const update of updates) {
      const taskRef = doc(db, 'tasks', update.taskId);
      batch.update(taskRef, {
        dependencies: []
      });
    }

    await batch.commit();
    console.log('✅ Successfully updated task dependencies!');

    return NextResponse.json({
      success: true,
      message: `Successfully removed dependencies from ${updates.length} tasks`,
      updates: updates.map(u => ({
        taskName: u.taskName,
        sortOrder: u.sortOrder,
        dependencies: 'None'
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
