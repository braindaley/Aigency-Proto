/**
 * Comprehensive fix for all ACORD tasks across all companies
 * 1. Fix system prompts
 * 2. Clean chat messages
 * 3. Reset tasks that need re-execution
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } = require('firebase/firestore');
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

const promptMappings = {
  'ACORD 130': 'acord-130-system-prompt.txt',
  'ACORD 125': 'acord-125-system-prompt.txt'
};

async function fixAllTasksComprehensive() {
  console.log('=== COMPREHENSIVE TASK FIX ===\n');

  let totalTasksChecked = 0;
  let totalPromptsFixed = 0;
  let totalMessagesClean = 0;
  let totalTasksReset = 0;

  // Get all company tasks
  const tasksRef = collection(db, 'companyTasks');
  const tasksSnapshot = await getDocs(tasksRef);

  console.log(`Found ${tasksSnapshot.docs.length} total tasks\n`);

  for (const taskDoc of tasksSnapshot.docs) {
    const task = taskDoc.data();
    const taskName = task.taskName || '';
    const taskId = taskDoc.id;

    // Only process ACORD tasks
    let promptFile = null;
    for (const [pattern, file] of Object.entries(promptMappings)) {
      if (taskName.includes(pattern)) {
        promptFile = file;
        break;
      }
    }

    if (!promptFile) continue;

    totalTasksChecked++;
    console.log(`\nProcessing: ${taskName}`);
    console.log(`  ID: ${taskId}`);
    console.log(`  Company: ${task.companyId}`);
    console.log(`  Status: ${task.status}`);

    let taskNeedsReset = false;

    // 1. Fix system prompt if needed
    const hasJsonFormat = task.systemPrompt &&
      (task.systemPrompt.includes('json') || task.systemPrompt.includes('JSON'));

    if (hasJsonFormat) {
      console.log(`  📝 Fixing system prompt...`);
      const promptPath = path.join(__dirname, '..', promptFile);
      const correctPrompt = fs.readFileSync(promptPath, 'utf8');

      await updateDoc(taskDoc.ref, {
        systemPrompt: correctPrompt,
        updatedAt: new Date().toISOString()
      });

      totalPromptsFixed++;
      taskNeedsReset = true;
      console.log(`  ✅ System prompt updated`);
    }

    // 2. Clean chat messages
    try {
      const chatRef = collection(db, 'taskChats', taskId, 'messages');
      const chatSnapshot = await getDocs(chatRef);

      let cleaned = 0;
      for (const msgDoc of chatSnapshot.docs) {
        const msg = msgDoc.data();

        if (!msg.content) continue;

        const hasIssues = msg.content.includes('<artifact>') ||
                         msg.content.includes('```json') ||
                         (msg.content.match(/^\s*\{/) && msg.content.includes('"applicant_information"'));

        if (hasIssues) {
          let cleanContent = msg.content
            .replace(/<artifact>[\s\S]*?<\/artifact>/g, '')
            .replace(/```json[\s\S]*?```/g, '')
            .trim();

          if (!cleanContent || cleanContent.length < 20) {
            cleanContent = `I've generated the ${taskName} document. You can view it in the artifact viewer or download it from the artifacts section.`;
          }

          await updateDoc(msgDoc.ref, {
            content: cleanContent,
            cleanedAt: new Date().toISOString(),
            hadArtifact: true
          });

          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`  🧹 Cleaned ${cleaned} chat message(s)`);
        totalMessagesClean += cleaned;
        taskNeedsReset = true;
      }
    } catch (error) {
      console.log(`  ⚠️ No chat messages to clean`);
    }

    // 3. Reset task if it had issues and is completed
    if (taskNeedsReset && task.status === 'completed') {
      console.log(`  🔄 Resetting task for re-execution...`);

      await updateDoc(taskDoc.ref, {
        status: 'Needs attention',
        completedAt: null,
        updatedAt: new Date().toISOString()
      });

      // Delete old artifacts
      try {
        const artifactsRef = collection(db, `companies/${task.companyId}/artifacts`);
        const artifactsSnapshot = await getDocs(artifactsRef);

        for (const artifactDoc of artifactsSnapshot.docs) {
          const artifactData = artifactDoc.data();
          if (artifactData.taskId === taskId) {
            await deleteDoc(artifactDoc.ref);
          }
        }
      } catch (error) {
        // Ignore artifact deletion errors
      }

      totalTasksReset++;
      console.log(`  ✅ Task reset to "Needs attention"`);
    } else if (!taskNeedsReset) {
      console.log(`  ✅ No changes needed`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n=== FIX COMPLETE ===');
  console.log(`ACORD tasks checked: ${totalTasksChecked}`);
  console.log(`System prompts fixed: ${totalPromptsFixed}`);
  console.log(`Chat messages cleaned: ${totalMessagesClean}`);
  console.log(`Tasks reset for re-execution: ${totalTasksReset}`);

  if (totalTasksReset > 0) {
    console.log(`\n✅ ${totalTasksReset} task(s) are ready to be re-run with correct markdown format`);
  } else {
    console.log('\n✅ All ACORD tasks are already in correct state');
  }
}

fixAllTasksComprehensive()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
