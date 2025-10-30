const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAcz7kZJH4Jb8TEnzBIgQI3r5gxEZP_dKI",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1066649353387",
  appId: "1:1066649353387:web:3a8e71d32f3c33b3b82b23"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTaskDetails() {
  const taskId = '0KrjIKoos5nw58wT90g7'; // Task 6: ACORD 125

  console.log('🔍 Checking Task 6 details...\n');

  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));

  if (!taskDoc.exists()) {
    console.log('❌ Task not found');
    return;
  }

  const task = taskDoc.data();

  console.log('📋 Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Tag:', task.tag);
  console.log('  Phase:', task.phase);
  console.log('\n📝 System Prompt:');
  console.log(task.systemPrompt || '  [No system prompt]');
  console.log('\n🧪 Test Criteria:');
  console.log(task.testCriteria || '  [No test criteria]');
}

checkTaskDetails()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
