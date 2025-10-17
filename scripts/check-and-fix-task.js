/**
 * Check a specific task and fix it if needed
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, getDocs, deleteDoc } = require('firebase/firestore');
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

const taskId = process.argv[2] || 'v9gct3rb9OK9Ge46dyds';

async function checkAndFixTask() {
  console.log('=== CHECKING AND FIXING TASK ===\n');

  // Get task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('Task not found!');
    return;
  }

  const task = taskDoc.data();

  console.log('Task Details:');
  console.log('  ID:', taskId);
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Tag:', task.tag);
  console.log('  Company ID:', task.companyId);

  // Check system prompt
  console.log('\nSystem Prompt Check:');
  const hasJsonFormat = task.systemPrompt &&
    (task.systemPrompt.includes('json') || task.systemPrompt.includes('JSON'));

  if (hasJsonFormat) {
    console.log('  ⚠️ System prompt contains JSON format instruction');

    // Determine which prompt file to use
    let promptFile = null;
    if (task.taskName?.includes('ACORD 130')) {
      promptFile = 'acord-130-system-prompt.txt';
    } else if (task.taskName?.includes('ACORD 125')) {
      promptFile = 'acord-125-system-prompt.txt';
    }

    if (promptFile) {
      console.log(`  📝 Updating with: ${promptFile}`);
      const promptPath = path.join(__dirname, '..', promptFile);
      const correctPrompt = fs.readFileSync(promptPath, 'utf8');

      await updateDoc(taskRef, {
        systemPrompt: correctPrompt,
        updatedAt: new Date().toISOString()
      });

      console.log('  ✅ System prompt updated');
    }
  } else {
    console.log('  ✅ System prompt is correct (no JSON format)');
  }

  // Clean chat messages
  console.log('\nCleaning Chat Messages:');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnapshot = await getDocs(chatRef);

  let cleaned = 0;
  for (const msgDoc of chatSnapshot.docs) {
    const msg = msgDoc.data();

    if (!msg.content) continue;

    const hasIssues = msg.content.includes('<artifact>') ||
                     msg.content.includes('```json') ||
                     msg.content.match(/^\s*\{/);

    if (hasIssues) {
      let cleanContent = msg.content
        .replace(/<artifact>[\s\S]*?<\/artifact>/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .trim();

      if (!cleanContent || cleanContent.length < 20) {
        cleanContent = `I've generated the ${task.taskName} document. You can view it in the artifact viewer or download it from the artifacts section.`;
      }

      await updateDoc(msgDoc.ref, {
        content: cleanContent,
        cleanedAt: new Date().toISOString(),
        hadArtifact: true
      });

      cleaned++;
    }
  }

  console.log(`  ✅ Cleaned ${cleaned} message(s)`);

  // Reset task if it had JSON issues
  if (hasJsonFormat || cleaned > 0) {
    console.log('\nResetting Task:');

    await updateDoc(taskRef, {
      status: 'Needs attention',
      completedAt: null,
      updatedAt: new Date().toISOString()
    });

    console.log('  ✅ Task reset to "Needs attention"');

    // Clear old artifacts
    const artifactsRef = collection(db, `companies/${task.companyId}/artifacts`);
    const artifactsSnapshot = await getDocs(artifactsRef);

    for (const artifactDoc of artifactsSnapshot.docs) {
      const artifactData = artifactDoc.data();
      if (artifactData.taskId === taskId) {
        await deleteDoc(artifactDoc.ref);
        console.log(`  🗑️ Deleted artifact: ${artifactData.name}`);
      }
    }
  }

  console.log('\n=== FIX COMPLETE ===');
  console.log(`\nTask URL: http://localhost:9002/companies/${task.companyId}/tasks/${taskId}`);
  console.log('The task is ready to be re-run with the correct markdown format.');
}

checkAndFixTask()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
