/**
 * Sync all task dependencies across all companies
 * This can be run periodically to ensure all tasks are in the correct state
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function syncAllDependencies() {
  console.log('=== SYNCING ALL TASK DEPENDENCIES ===\n');

  // Get all companies
  const companiesRef = collection(db, 'companies');
  const companiesSnapshot = await getDocs(companiesRef);

  console.log(`Found ${companiesSnapshot.docs.length} companies\n`);

  let totalFixed = 0;
  let totalChecked = 0;

  for (const companyDoc of companiesSnapshot.docs) {
    const company = companyDoc.data();
    const companyId = companyDoc.id;

    console.log(`\nChecking: ${company.name} (${companyId})`);

    // Get all tasks for this company
    const tasksRef = collection(db, 'companyTasks');
    const tasksSnapshot = await getDocs(tasksRef);

    const tasks = tasksSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(task => task.companyId === companyId);

    totalChecked += tasks.length;

    // Find stuck tasks
    const tasksToFix = tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'Needs attention') {
        return false;
      }

      if (!task.dependencies || task.dependencies.length === 0) {
        // No dependencies - should be "Needs attention" if not completed
        return true;
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

    if (tasksToFix.length > 0) {
      console.log(`  Found ${tasksToFix.length} stuck task(s)`);

      for (const task of tasksToFix) {
        console.log(`    - ${task.taskName} (${task.status} → Needs attention)`);

        const taskRef = doc(db, 'companyTasks', task.id);
        await updateDoc(taskRef, {
          status: 'Needs attention',
          updatedAt: new Date().toISOString()
        });

        totalFixed++;

        // If it's an AI task, we could trigger auto-execution here
        // But to avoid overwhelming the system, we'll just update the status
        // and let the user or periodic job trigger execution
      }
    } else {
      console.log(`  ✅ All tasks in correct state`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n=== SYNC COMPLETE ===`);
  console.log(`Total tasks checked: ${totalChecked}`);
  console.log(`Total tasks fixed: ${totalFixed}`);

  if (totalFixed > 0) {
    console.log(`\n✅ ${totalFixed} task(s) updated to "Needs attention"`);
    console.log('These tasks are now ready for execution');
  } else {
    console.log('\n✅ No stuck tasks found - all dependencies are correctly resolved');
  }
}

syncAllDependencies()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
