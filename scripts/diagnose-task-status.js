const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, getDoc, doc } = require('firebase/firestore');

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

async function diagnoseTaskStatus() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const renewalType = 'workers-comp';

  console.log('=== TASK STATUS DIAGNOSIS ===\n');
  console.log(`Company: ${companyId}`);
  console.log(`Renewal Type: ${renewalType}\n`);

  // Get all company tasks
  const companyTasksRef = collection(db, 'companyTasks');
  const companyTasksQuery = query(
    companyTasksRef,
    where('companyId', '==', companyId),
    where('renewalType', '==', renewalType)
  );
  const companyTasksSnap = await getDocs(companyTasksQuery);

  const tasks = [];
  companyTasksSnap.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      name: data.taskName,
      sortOrder: data.sortOrder || 0,
      status: data.status,
      phase: data.phase,
      tag: data.tag,
      dependencies: data.dependencies || [],
      templateId: data.templateId
    });
  });

  // Sort by sortOrder
  tasks.sort((a, b) => a.sortOrder - b.sortOrder);

  console.log('=== TASK STATUS BREAKDOWN ===\n');

  const statusCounts = {
    'Needs attention': 0,
    'Upcoming': 0,
    'completed': 0,
    'other': 0
  };

  const tasksByStatus = {
    'Needs attention': [],
    'Upcoming': [],
    'completed': [],
    'other': []
  };

  tasks.forEach(task => {
    const status = task.status;
    if (status === 'Needs attention') {
      statusCounts['Needs attention']++;
      tasksByStatus['Needs attention'].push(task);
    } else if (status === 'Upcoming') {
      statusCounts['Upcoming']++;
      tasksByStatus['Upcoming'].push(task);
    } else if (status === 'completed') {
      statusCounts['completed']++;
      tasksByStatus['completed'].push(task);
    } else {
      statusCounts['other']++;
      tasksByStatus['other'].push(task);
    }
  });

  console.log('Status Summary:');
  console.log(`  Needs attention: ${statusCounts['Needs attention']}`);
  console.log(`  Upcoming: ${statusCounts['Upcoming']}`);
  console.log(`  Completed: ${statusCounts['completed']}`);
  console.log(`  Other: ${statusCounts['other']}\n`);

  console.log('=== ANALYZING "UPCOMING" TASKS (Should some be "Needs attention"?) ===\n');

  for (const task of tasksByStatus['Upcoming']) {
    console.log(`📋 Task ${task.sortOrder}: ${task.name}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Tag: ${task.tag}`);
    console.log(`   Dependencies: ${JSON.stringify(task.dependencies)}`);

    // Check if dependencies are met
    if (task.dependencies.length === 0) {
      console.log(`   ⚠️  NO DEPENDENCIES - Should be "Needs attention"!`);
    } else {
      console.log(`   Checking ${task.dependencies.length} dependencies...`);

      let allCompleted = true;
      for (const depId of task.dependencies) {
        // Try to find by templateId
        const depTask = tasks.find(t => t.templateId === depId || t.id === depId);

        if (!depTask) {
          console.log(`     ❌ Dependency "${depId}" not found in company tasks`);
          allCompleted = false;
        } else {
          const isCompleted = depTask.status === 'completed';
          console.log(`     ${isCompleted ? '✅' : '❌'} ${depTask.name} (${depTask.status})`);
          if (!isCompleted) {
            allCompleted = false;
          }
        }
      }

      if (allCompleted) {
        console.log(`   ⚠️  ALL DEPENDENCIES MET - Should be "Needs attention"!`);
      } else {
        console.log(`   ✅ Correctly in "Upcoming" (dependencies not met)`);
      }
    }
    console.log('');
  }

  console.log('=== TASKS THAT SHOULD BE "NEEDS ATTENTION" ===\n');

  const shouldBeNeedsAttention = [];

  for (const task of tasksByStatus['Upcoming']) {
    if (task.dependencies.length === 0) {
      shouldBeNeedsAttention.push({ task, reason: 'No dependencies' });
      continue;
    }

    let allCompleted = true;
    for (const depId of task.dependencies) {
      const depTask = tasks.find(t => t.templateId === depId || t.id === depId);
      if (!depTask || depTask.status !== 'completed') {
        allCompleted = false;
        break;
      }
    }

    if (allCompleted) {
      shouldBeNeedsAttention.push({ task, reason: 'All dependencies completed' });
    }
  }

  if (shouldBeNeedsAttention.length === 0) {
    console.log('✅ No tasks found that should be "Needs attention"\n');
  } else {
    console.log(`⚠️  Found ${shouldBeNeedsAttention.length} task(s) that should be "Needs attention":\n`);
    shouldBeNeedsAttention.forEach(({ task, reason }) => {
      console.log(`${task.sortOrder}. ${task.name}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Reason: ${reason}`);
      console.log('');
    });

    console.log('=== RECOMMENDATION ===\n');
    console.log('Run this script to fix the statuses:');
    console.log('  node scripts/fix-upcoming-tasks.js\n');
  }
}

diagnoseTaskStatus().catch(console.error);
