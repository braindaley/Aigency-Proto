/**
 * Fix the ACORD 130 task system prompt to use markdown format instead of JSON
 */

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

const taskId = 'ubzOt0QWVFXxSYXEZOzM';

async function fixSystemPrompt() {
  console.log('=== FIXING ACORD 130 SYSTEM PROMPT ===\n');

  // Read the correct system prompt from file
  const promptPath = path.join(__dirname, '..', 'acord-130-system-prompt.txt');
  const correctPrompt = fs.readFileSync(promptPath, 'utf8');

  console.log('Loaded correct system prompt from acord-130-system-prompt.txt');
  console.log('Prompt length:', correctPrompt.length, 'characters');

  // Update the task
  const taskRef = doc(db, 'companyTasks', taskId);

  await updateDoc(taskRef, {
    systemPrompt: correctPrompt,
    updatedAt: new Date().toISOString()
  });

  console.log('\n✅ Task system prompt updated successfully!');
  console.log('The task will now generate markdown-formatted ACORD 130 forms instead of JSON.');
}

fixSystemPrompt()
  .then(() => {
    console.log('\n=== FIX COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
