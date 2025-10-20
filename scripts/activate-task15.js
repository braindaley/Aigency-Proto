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

async function activateTask15() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';

  console.log('\n=== Finding and activating Task 15 ===\n');

  // Get all company tasks
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  // Find Task 15 by sortOrder
  let task15 = null;
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.sortOrder === 15) {
      task15 = { id: doc.id, ...data };
    }
  });

  if (!task15) {
    console.log('❌ Task 15 not found');
    process.exit(1);
  }

  console.log(`Found Task 15: ${task15.taskName}`);
  console.log(`  Current status: ${task15.status}`);
  console.log(`  ID: ${task15.id}`);

  if (task15.status === 'Upcoming' || task15.status === 'upcoming') {
    console.log('\n🔄 Updating Task 15 to "pending" (Needs attention)...');
    const taskRef = doc(db, 'companyTasks', task15.id);
    await updateDoc(taskRef, {
      status: 'pending',
      updatedAt: new Date()
    });
    console.log('✅ Task 15 is now active with "Needs attention" status');
  } else {
    console.log(`\nTask 15 already has status: ${task15.status}`);
  }

  process.exit(0);
}

activateTask15().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
