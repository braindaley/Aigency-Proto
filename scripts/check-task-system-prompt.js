/**
 * Check the system prompt for the ACORD 130 task
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

const taskId = 'ubzOt0QWVFXxSYXEZOzM';

async function checkSystemPrompt() {
  console.log('=== CHECKING TASK SYSTEM PROMPT ===\n');

  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (taskDoc.exists()) {
    const task = taskDoc.data();
    console.log('Task Name:', task.taskName);
    console.log('\nSystem Prompt:');
    console.log('='.repeat(80));
    console.log(task.systemPrompt || 'NO SYSTEM PROMPT FOUND');
    console.log('='.repeat(80));

    console.log('\n\nTest Criteria:');
    console.log('='.repeat(80));
    console.log(task.testCriteria || 'NO TEST CRITERIA FOUND');
    console.log('='.repeat(80));
  } else {
    console.log('Task not found!');
  }
}

checkSystemPrompt()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
