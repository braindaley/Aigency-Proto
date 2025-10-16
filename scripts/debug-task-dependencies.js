/**
 * Debug script to check task dependencies for TWR Enterprises
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function debugDependencies() {
  console.log('=== DEBUGGING TASK DEPENDENCIES ===\n');

  // Get all tasks for this company
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  const tasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Sort by phase and order
  tasks.sort((a, b) => {
    const phaseOrder = { 'Submission': 1, 'Renewal': 2, 'Review': 3 };
    if (a.phase !== b.phase) {
      return (phaseOrder[a.phase] || 999) - (phaseOrder[b.phase] || 999);
    }
    return (a.order || 0) - (b.order || 0);
  });

  console.log(`Found ${tasks.length} tasks for company TWR Enterprises\n`);
  console.log('=' .repeat(120));

  tasks.forEach((task, index) => {
    console.log(`\n${index + 1}. ${task.taskName}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Template ID: ${task.templateId}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Phase: ${task.phase}`);
    console.log(`   Tag: ${task.tag}`);
    console.log(`   Order: ${task.order || 'N/A'}`);

    if (task.dependencies && task.dependencies.length > 0) {
      console.log(`   Dependencies: ${JSON.stringify(task.dependencies)}`);

      // Check if dependencies are met
      const depsStatus = task.dependencies.map(depId => {
        const depTask = tasks.find(t => t.id === depId || t.templateId === depId || String(t.templateId) === depId);
        if (depTask) {
          return `${depTask.taskName} (${depTask.status})`;
        } else {
          return `${depId} (NOT FOUND)`;
        }
      });

      console.log(`   Dependencies Status:`);
      depsStatus.forEach(status => {
        console.log(`     - ${status}`);
      });

      const allCompleted = task.dependencies.every(depId => {
        const depTask = tasks.find(t => t.id === depId || t.templateId === depId || String(t.templateId) === depId);
        return depTask && depTask.status === 'completed';
      });

      console.log(`   All Dependencies Met: ${allCompleted ? '✅ YES' : '❌ NO'}`);

      if (allCompleted && task.status !== 'completed' && task.status !== 'Needs attention') {
        console.log(`   >>> SHOULD BE "Needs attention" BUT IS "${task.status}" <<<`);
      }
    } else {
      console.log(`   Dependencies: None`);
    }
  });

  console.log('\n' + '='.repeat(120));

  // Summary
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const needsAttention = tasks.filter(t => t.status === 'Needs attention').length;
  const blocked = tasks.filter(t => t.status !== 'completed' && t.status !== 'Needs attention').length;

  console.log('\n=== SUMMARY ===');
  console.log(`Total Tasks: ${tasks.length}`);
  console.log(`Completed: ${completedTasks}`);
  console.log(`Needs Attention: ${needsAttention}`);
  console.log(`Blocked/Other: ${blocked}`);

  // Find tasks that should be "Needs attention" but aren't
  const shouldBeNeedsAttention = tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'Needs attention') {
      return false;
    }

    if (!task.dependencies || task.dependencies.length === 0) {
      return true; // No dependencies, should be available
    }

    const allCompleted = task.dependencies.every(depId => {
      const depTask = tasks.find(t => t.id === depId || t.templateId === depId || String(t.templateId) === depId);
      return depTask && depTask.status === 'completed';
    });

    return allCompleted;
  });

  if (shouldBeNeedsAttention.length > 0) {
    console.log(`\n⚠️ TASKS THAT SHOULD BE "Needs attention": ${shouldBeNeedsAttention.length}`);
    shouldBeNeedsAttention.forEach(task => {
      console.log(`  - ${task.taskName} (current status: ${task.status})`);
    });
  } else {
    console.log('\n✅ All task statuses are correct');
  }
}

debugDependencies()
  .then(() => {
    console.log('\n=== DEBUG COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
