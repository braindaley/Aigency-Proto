const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAPbristGE8ytc59RD-KL0JMJL-EuVW23R8",
  authDomain: "aigency-mvp.firebaseapp.com",
  projectId: "aigency-mvp",
  storageBucket: "aigency-mvp.firebasestorage.app",
  messagingSenderId: "326368003305",
  appId: "1:326368003305:web:0c95f9e94ed99f4ac27bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAndUpdateNextTask() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const task14Id = 'ZNI9YtiaPJX0TG5pBjsF'; // Task 14 that was just completed

  console.log('\n=== Checking for tasks that depend on Task 14 ===\n');

  // Get all company tasks
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  const tasks = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      taskName: data.taskName,
      sortOrder: data.sortOrder,
      status: data.status,
      dependencies: data.dependencies || []
    });
  });

  // Sort by sortOrder
  tasks.sort((a, b) => a.sortOrder - b.sortOrder);

  console.log('Current task statuses:');
  tasks.slice(10, 20).forEach(task => {
    console.log(`  ${task.sortOrder}. ${task.taskName}: ${task.status}`);
  });

  // Find tasks that depend on Task 14
  const dependentTasks = tasks.filter(task =>
    task.dependencies.includes(task14Id) && task.status !== 'completed'
  );

  if (dependentTasks.length === 0) {
    console.log('\n⚠️  No tasks found that depend on Task 14');
    console.log('This might mean Task 15 has the wrong dependency (template ID instead of company task ID)');

    // Find Task 15 by sortOrder
    const task15 = tasks.find(t => t.sortOrder === 15);
    if (task15) {
      console.log(`\nFound Task 15: ${task15.taskName} (${task15.id})`);
      console.log(`  Current status: ${task15.status}`);
      console.log(`  Dependencies: ${task15.dependencies.join(', ')}`);

      if (task15.status === 'Upcoming' || task15.status === 'upcoming') {
        console.log('\n🔄 Updating Task 15 to "Needs attention"...');
        const task15Ref = doc(db, 'companyTasks', task15.id);
        await updateDoc(task15Ref, {
          status: 'pending',
          updatedAt: new Date()
        });
        console.log('✅ Task 15 status updated to pending (Needs attention)');
      }
    }
  } else {
    console.log(`\nFound ${dependentTasks.length} tasks that depend on Task 14:`);
    for (const task of dependentTasks) {
      console.log(`\n  ${task.sortOrder}. ${task.taskName} (${task.id})`);
      console.log(`     Current status: ${task.status}`);

      if (task.status === 'Upcoming' || task.status === 'upcoming') {
        console.log('     🔄 Updating to "Needs attention"...');
        const taskRef = doc(db, 'companyTasks', task.id);
        await updateDoc(taskRef, {
          status: 'pending',
          updatedAt: new Date()
        });
        console.log('     ✅ Status updated');
      }
    }
  }

  process.exit(0);
}

checkAndUpdateNextTask().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
