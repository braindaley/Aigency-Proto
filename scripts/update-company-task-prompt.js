const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateCompanyTaskPrompt() {
  try {
    // Read the new system prompt from file
    const promptPath = path.join(__dirname, '..', 'acord-130-system-prompt.txt');
    const newSystemPrompt = fs.readFileSync(promptPath, 'utf8');

    console.log('📄 Loaded new ACORD 130 system prompt from file');

    // The specific task from the user's URL
    const companyId = 'B2JRUCeZuzLZFoUHIDPv';
    const taskId = '6myJQSarKUuvgKhOt3mt';

    const taskRef = doc(db, 'companyTasks', taskId);

    console.log('🔍 Fetching task:', taskId);
    const taskSnap = await getDoc(taskRef);

    if (!taskSnap.exists()) {
      console.log('❌ Task not found');
      process.exit(1);
    }

    const taskData = taskSnap.data();
    console.log('✅ Task found:', taskData.taskName);
    console.log('📋 Current prompt length:', taskData.systemPrompt?.length || 0, 'characters');

    // Update the system prompt
    await updateDoc(taskRef, {
      systemPrompt: newSystemPrompt,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Successfully updated task system prompt in Firestore');
    console.log('📝 New prompt length:', newSystemPrompt.length, 'characters');
    console.log('🔗 Task URL: http://localhost:9002/companies/' + companyId + '/tasks/' + taskId);

  } catch (error) {
    console.error('❌ Error updating task prompt:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateCompanyTaskPrompt();
