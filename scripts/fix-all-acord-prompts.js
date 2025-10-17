/**
 * Fix ALL ACORD task system prompts to use markdown format instead of JSON
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');
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

// Map of task name patterns to their correct system prompt files
const promptMappings = {
  'ACORD 130': 'acord-130-system-prompt.txt',
  'ACORD 125': 'acord-125-system-prompt.txt'
};

async function fixAllAcordPrompts() {
  console.log('=== FIXING ALL ACORD TASK PROMPTS ===\n');

  let totalFixed = 0;

  // Get all company tasks
  const tasksRef = collection(db, 'companyTasks');
  const tasksSnapshot = await getDocs(tasksRef);

  console.log(`Found ${tasksSnapshot.docs.length} total tasks\n`);

  for (const taskDoc of tasksSnapshot.docs) {
    const task = taskDoc.data();
    const taskName = task.taskName || '';

    // Check if this is an ACORD task
    let promptFile = null;
    for (const [pattern, file] of Object.entries(promptMappings)) {
      if (taskName.includes(pattern)) {
        promptFile = file;
        break;
      }
    }

    if (!promptFile) continue;

    // Check if the system prompt has JSON format
    if (task.systemPrompt && (task.systemPrompt.includes('json') || task.systemPrompt.includes('JSON'))) {
      console.log(`Fixing: ${taskName} (${taskDoc.id})`);
      console.log(`  Using prompt file: ${promptFile}`);

      try {
        // Read the correct system prompt from file
        const promptPath = path.join(__dirname, '..', promptFile);
        const correctPrompt = fs.readFileSync(promptPath, 'utf8');

        // Update the task
        await updateDoc(taskDoc.ref, {
          systemPrompt: correctPrompt,
          updatedAt: new Date().toISOString()
        });

        console.log(`  ✅ Updated (${correctPrompt.length} characters)`);
        totalFixed++;
      } catch (error) {
        console.error(`  ❌ Error:`, error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Fixed ${totalFixed} ACORD task(s)`);

  if (totalFixed === 0) {
    console.log('No tasks needed fixing - all ACORD tasks already have correct prompts');
  } else {
    console.log('\nThese tasks will now generate markdown-formatted forms instead of JSON');
  }
}

fixAllAcordPrompts()
  .then(() => {
    console.log('\n=== FIX COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
