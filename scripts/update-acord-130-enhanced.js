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

async function updateTask() {
  console.log('=== UPDATING ACORD 130 TASK WITH ENHANCED PROMPT ===\n');

  const taskId = 'u1UABltnXCqKIbhWCTVx';
  
  // Read the enhanced system prompt from file
  const promptPath = path.join(__dirname, '..', 'acord-130-system-prompt.txt');
  const enhancedPrompt = fs.readFileSync(promptPath, 'utf8');
  
  console.log('Task ID: ' + taskId);
  console.log('Enhanced prompt length: ' + enhancedPrompt.length + ' characters');
  console.log('\nEnhancements added:');
  console.log('- Explicit instruction that this is the ACTUAL form, not a draft');
  console.log('- Guidance to use reasonable defaults for missing data');
  console.log('- Specific defaults for common fields (contact, email, overtime)');
  console.log('- Emphasis on COMPLETE form generation');
  console.log('- Validation requirements for submission');

  // Update the task
  const taskRef = doc(db, 'companyTasks', taskId);
  await updateDoc(taskRef, {
    systemPrompt: enhancedPrompt,
    updatedAt: new Date().toISOString()
  });

  console.log('\n✅ Task updated successfully!');
  console.log('The ACORD 130 task will now:');
  console.log('1. Generate markdown instead of JSON');
  console.log('2. Create a COMPLETE form suitable for submission');
  console.log('3. Use reasonable defaults for any missing data');
}

updateTask()
  .then(() => process.exit(0))
  .catch(console.error);
