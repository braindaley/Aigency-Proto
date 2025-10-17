const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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

async function fixTask() {
  console.log('=== FIXING ACORD 125 TASK ===\n');

  const taskId = 'CB9MG6MMVDkYkdF4vqlm';
  
  // Read the correct system prompt from file
  const promptPath = path.join(__dirname, '..', 'acord-125-system-prompt.txt');
  const correctPrompt = fs.readFileSync(promptPath, 'utf8');
  
  console.log('Task ID: ' + taskId);
  console.log('New prompt length: ' + correctPrompt.length + ' characters');
  console.log('New prompt uses markdown format');

  // Update the task
  const taskRef = doc(db, 'companyTasks', taskId);
  await updateDoc(taskRef, {
    systemPrompt: correctPrompt,
    updatedAt: new Date().toISOString()
  });

  console.log('\n✅ Task updated successfully!');
  console.log('The ACORD 125 task will now generate markdown format instead of JSON');
}

fixTask()
  .then(() => process.exit(0))
  .catch(console.error);
