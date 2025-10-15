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

async function updateAcord130Prompt() {
  try {
    // Read the new system prompt from file
    const promptPath = path.join(__dirname, '..', 'acord-130-system-prompt.txt');
    const newSystemPrompt = fs.readFileSync(promptPath, 'utf8');

    console.log('📄 Loaded new ACORD 130 system prompt from file');
    console.log(`📏 Prompt length: ${newSystemPrompt.length} characters`);

    // Get the task template document
    const taskTemplateId = 'qMkNQITF8u7nvts7troM'; // ACORD 130 task template ID
    const taskTemplateRef = doc(db, 'taskTemplates', taskTemplateId);

    console.log('🔍 Checking if task template exists...');
    const taskTemplateSnap = await getDoc(taskTemplateRef);

    if (!taskTemplateSnap.exists()) {
      console.log('❌ Task template not found with ID:', taskTemplateId);
      console.log('💡 Checking workers-comp-tasks-complete.json for alternative...');

      // Alternative: Update the JSON file directly
      const jsonPath = path.join(__dirname, '..', 'workers-comp-tasks-complete.json');
      const tasksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      const taskIndex = tasksData.findIndex(t => t.id === taskTemplateId);
      if (taskIndex !== -1) {
        tasksData[taskIndex].systemPrompt = newSystemPrompt;
        fs.writeFileSync(jsonPath, JSON.stringify(tasksData, null, 2));
        console.log('✅ Updated ACORD 130 system prompt in workers-comp-tasks-complete.json');
        console.log('📝 You may need to re-import this task template to Firestore');
      } else {
        console.log('❌ Task not found in JSON file either');
      }
      return;
    }

    console.log('✅ Task template found:', taskTemplateSnap.data().taskName);

    // Update the system prompt
    await updateDoc(taskTemplateRef, {
      systemPrompt: newSystemPrompt,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Successfully updated ACORD 130 system prompt in Firestore');
    console.log('📋 Task Template ID:', taskTemplateId);
    console.log('📝 Task Name:', taskTemplateSnap.data().taskName);

    // Also update the JSON file for consistency
    const jsonPath = path.join(__dirname, '..', 'workers-comp-tasks-complete.json');
    const tasksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const taskIndex = tasksData.findIndex(t => t.id === taskTemplateId);

    if (taskIndex !== -1) {
      tasksData[taskIndex].systemPrompt = newSystemPrompt;
      fs.writeFileSync(jsonPath, JSON.stringify(tasksData, null, 2));
      console.log('✅ Also updated workers-comp-tasks-complete.json for consistency');
    }

  } catch (error) {
    console.error('❌ Error updating system prompt:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateAcord130Prompt();
