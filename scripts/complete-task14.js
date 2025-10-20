const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function completeTask14() {
  const task14Id = 'ZNI9YtiaPJX0TG5pBjsF';

  console.log('\n🎯 Marking Task 14 as completed...');

  const taskRef = doc(db, 'companyTasks', task14Id);
  await updateDoc(taskRef, {
    status: 'completed',
    updatedAt: new Date()
  });

  console.log('✅ Task 14 marked as completed!');
  console.log('\nRefresh the page to see the status change.');

  process.exit(0);
}

completeTask14().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
