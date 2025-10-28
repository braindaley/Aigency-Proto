#!/usr/bin/env node
/**
 * Set Interface Types for All Worker's Comp Tasks
 * Updates all tasks to have explicit interfaceType based on detection logic
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

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

function detectInterfaceType(task) {
  // Legacy detection logic
  const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 ||
                          task.taskName?.toLowerCase().includes('send submission') ||
                          task.taskName?.toLowerCase().includes('send follow-up');
  const isQuestionTask = task.sortOrder === 15 ||
                        task.taskName?.toLowerCase().includes('review flagged') ||
                        task.taskName?.toLowerCase().includes('underwriter questions');
  const hasDependencies = task.dependencies && task.dependencies.length > 0;

  if (isSubmissionTask) {
    return 'email';
  } else if (isQuestionTask) {
    return 'chat';
  } else if (hasDependencies || task.showDependencyArtifacts) {
    return 'artifact';
  } else {
    return 'chat';
  }
}

async function setInterfaceTypes() {
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('policyType', '==', 'workers-comp'));
  const snapshot = await getDocs(q);

  const tasks = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      taskName: data.taskName || 'Unnamed',
      sortOrder: data.sortOrder || 0,
      interfaceType: data.interfaceType,
      dependencies: data.dependencies || [],
      showDependencyArtifacts: data.showDependencyArtifacts
    });
  });

  console.log('\n🔧 Setting Interface Types for Worker\'s Comp Tasks\n');
  console.log('='.repeat(80));

  let updated = 0;
  let skipped = 0;

  for (const task of tasks) {
    const detectedType = detectInterfaceType(task);
    const currentType = task.interfaceType;

    if (currentType === detectedType) {
      console.log(`✓ Task ${task.sortOrder}: "${task.taskName}" - Already set to ${detectedType}`);
      skipped++;
    } else {
      console.log(`→ Task ${task.sortOrder}: "${task.taskName}"`);
      console.log(`  Current: ${currentType || 'not set'} → New: ${detectedType}`);

      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, { interfaceType: detectedType });
      updated++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Complete!`);
  console.log(`   Updated: ${updated} tasks`);
  console.log(`   Skipped: ${skipped} tasks (already correct)`);
  console.log(`   Total: ${tasks.length} tasks\n`);
}

setInterfaceTypes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
