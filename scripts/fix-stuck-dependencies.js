/**
 * Fix stuck task dependencies by manually triggering the dependency update
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const companyId = 'qsu1QXPB8TUK2P4QyDiy';

async function fixStuckDependencies() {
  console.log('=== FIXING STUCK TASK DEPENDENCIES ===\n');

  // Get all tasks for this company
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  const tasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`Found ${tasks.length} tasks\n`);

  // Find tasks that should be "Needs attention" but aren't
  const tasksToFix = tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'Needs attention') {
      return false;
    }

    if (!task.dependencies || task.dependencies.length === 0) {
      return true; // No dependencies, should be available
    }

    const allCompleted = task.dependencies.every(depId => {
      const depTask = tasks.find(t =>
        t.id === depId ||
        t.templateId === depId ||
        String(t.templateId) === depId
      );
      return depTask && depTask.status === 'completed';
    });

    return allCompleted;
  });

  if (tasksToFix.length === 0) {
    console.log('✅ No stuck tasks found - all dependencies are correctly resolved');
    return;
  }

  console.log(`Found ${tasksToFix.length} stuck task(s) to fix:\n`);

  for (const task of tasksToFix) {
    console.log(`\nFixing: ${task.taskName}`);
    console.log(`  Current Status: ${task.status}`);
    console.log(`  Dependencies:`, task.dependencies);

    // Check dependency status
    const depStatus = task.dependencies.map(depId => {
      const depTask = tasks.find(t =>
        t.id === depId ||
        t.templateId === depId ||
        String(t.templateId) === depId
      );
      return depTask ? `${depTask.taskName} (${depTask.status})` : `${depId} (NOT FOUND)`;
    });

    console.log(`  Dependency Status:`);
    depStatus.forEach(status => console.log(`    - ${status}`));

    // Update to "Needs attention"
    const taskRef = doc(db, 'companyTasks', task.id);
    await updateDoc(taskRef, {
      status: 'Needs attention',
      updatedAt: new Date().toISOString()
    });

    console.log(`  ✅ Updated to "Needs attention"`);

    // If it's an AI task, trigger auto-execution
    if (task.tag === 'ai') {
      console.log(`  🤖 This is an AI task - triggering auto-execution...`);

      try {
        const response = await fetch('http://localhost:9002/api/ai-task-completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.id,
            companyId: task.companyId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`  ✅ AI execution completed:`, {
            success: result.success,
            taskCompleted: result.taskCompleted,
            documentsUsed: result.documentsUsed,
            artifactsUsed: result.artifactsUsed
          });
        } else {
          const error = await response.json();
          console.log(`  ❌ AI execution failed:`, error.error);
        }
      } catch (error) {
        console.log(`  ❌ AI execution error:`, error.message);
      }
    }
  }

  console.log('\n=== FIX COMPLETE ===');
}

fixStuckDependencies()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
