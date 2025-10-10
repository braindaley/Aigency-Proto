import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'aigency-proto',
  });
}

const db = getFirestore();

async function updatePhaseDependencies() {
  try {
    console.log('Fetching workers-comp tasks...');

    // Get all workers-comp tasks
    const tasksSnapshot = await db.collection('tasks')
      .where('policyType', '==', 'workers-comp')
      .orderBy('sortOrder')
      .get();

    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${tasks.length} tasks`);

    // Find tasks with sortOrder 10, 17, 25, 31 and their predecessors
    const targetSortOrders = [10, 17, 25, 31];
    const updates: Array<{ taskId: string, sortOrder: number, previousTaskId: string }> = [];

    for (const sortOrder of targetSortOrders) {
      const currentTask = tasks.find(t => t.sortOrder === sortOrder);
      const previousTask = tasks.find(t => t.sortOrder === sortOrder - 1);

      if (currentTask && previousTask) {
        updates.push({
          taskId: currentTask.id,
          sortOrder: currentTask.sortOrder,
          previousTaskId: previousTask.id
        });
        console.log(`Task ${sortOrder} (${currentTask.taskName}) will depend on Task ${previousTask.sortOrder} (${previousTask.taskName})`);
      } else {
        console.warn(`Could not find task with sortOrder ${sortOrder} or ${sortOrder - 1}`);
      }
    }

    // Apply updates
    console.log('\nApplying updates...');
    const batch = db.batch();

    for (const update of updates) {
      const taskRef = db.collection('tasks').doc(update.taskId);
      batch.update(taskRef, {
        dependencies: [update.previousTaskId]
      });
    }

    await batch.commit();
    console.log('✅ Successfully updated task dependencies!');
    console.log(`Updated ${updates.length} tasks`);

  } catch (error) {
    console.error('Error updating dependencies:', error);
    throw error;
  }
}

updatePhaseDependencies()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
