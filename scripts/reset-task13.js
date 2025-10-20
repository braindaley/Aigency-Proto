const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAPbristGE8ytc59RD-KL0JMJL-EuVW23R8",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "326368003305",
  appId: "1:326368003305:web:0c95f9e94ed99f4ac27bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetTask13() {
  const taskId = 'B10M67bZTVuuI5TFDjRz'; // Task 13

  console.log('\nResetting Task 13 status to "pending"...');

  const taskRef = doc(db, 'companyTasks', taskId);
  await updateDoc(taskRef, {
    status: 'pending',
    updatedAt: new Date()
  });

  console.log('✅ Task 13 reset to pending status');
  console.log('\nNow you can trigger the AI task completion API');

  process.exit(0);
}

resetTask13().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
