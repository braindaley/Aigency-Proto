const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function findTask15() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';

  console.log('\n=== Looking for Task 15 ===\n');

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
      templateId: data.templateId
    });
  });

  // Sort by sortOrder
  tasks.sort((a, b) => a.sortOrder - b.sortOrder);

  console.log('All company tasks (sorted by sortOrder):');
  tasks.forEach(task => {
    console.log(`  ${task.sortOrder}. ${task.taskName} (${task.status})`);
  });

  // Check if Task 15 exists
  const task15 = tasks.find(t => t.sortOrder === 15);
  if (task15) {
    console.log(`\n✅ Found Task 15: ${task15.taskName}`);
    console.log(`   ID: ${task15.id}`);
    console.log(`   Status: ${task15.status}`);
    console.log(`   Template ID: ${task15.templateId}`);
  } else {
    console.log('\n❌ Task 15 does not exist as a company task');
    console.log('   It needs to be created from the template');
  }

  process.exit(0);
}

findTask15().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
