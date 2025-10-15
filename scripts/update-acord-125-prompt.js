// Update ACORD 125 task with new system prompt that includes Excel extraction instructions
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function updateAcord125Prompt() {
  try {
    // Read the updated ACORD 125 system prompt
    const promptPath = path.join(__dirname, '..', 'acord-125-system-prompt.txt');
    const newSystemPrompt = fs.readFileSync(promptPath, 'utf8');

    console.log('📄 New system prompt loaded:');
    console.log(`   Length: ${newSystemPrompt.length} characters`);
    console.log(`   Preview: ${newSystemPrompt.substring(0, 200)}...\n`);

    // Update the ACORD 125 task in Firestore
    const taskId = 'lygPPyA0JiRBVG5dMVWU'; // The ACORD 125 task ID
    const companyId = 'B2JRUCeZuzLZFoUHIDPv'; // Cornerstone Construction Group

    // Get task from companyTasks collection
    const taskRef = db.collection('companyTasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      console.error(`❌ Task ${taskId} not found in companyTasks collection`);
      return;
    }

    console.log(`✅ Found task: ${taskDoc.data().taskName}`);

    // Update the system prompt
    await taskRef.update({
      systemPrompt: newSystemPrompt,
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Updated task ${taskId} with new system prompt including Excel extraction instructions\n`);

    // Also update in JSON file
    const jsonPath = path.join(__dirname, '..', 'workers-comp-tasks-complete.json');
    const tasksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Find and update ACORD 125 task
    const taskIndex = tasksData.tasks.findIndex(t => t.id === 'Z1YTH2FkhrcrAnvyvu1H');
    if (taskIndex !== -1) {
      tasksData.tasks[taskIndex].systemPrompt = newSystemPrompt;
      fs.writeFileSync(jsonPath, JSON.stringify(tasksData, null, 2));
      console.log('✅ Updated workers-comp-tasks-complete.json with new system prompt\n');
    }

    console.log('✅ All updates complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Regenerate the ACORD 125 document');
    console.log('   2. Verify that Employee/Payroll and Loss Run data is now being used');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

updateAcord125Prompt();
