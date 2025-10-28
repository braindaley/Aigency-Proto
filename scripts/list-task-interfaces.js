#!/usr/bin/env node
/**
 * List Worker's Comp Tasks with their Interface Types
 * Shows both explicit interfaceType settings and inferred types from legacy logic
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
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

async function listWorkerCompTaskInterfaces() {
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

  // Sort by sortOrder
  tasks.sort((a, b) => a.sortOrder - b.sortOrder);

  console.log('\n📋 Worker\'s Comp Tasks - Interface Types\n');
  console.log('='.repeat(80));

  tasks.forEach(task => {
    let interfaceType = task.interfaceType;
    let source = 'explicit';

    if (!interfaceType) {
      // Apply legacy detection logic
      const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 ||
                              task.taskName?.toLowerCase().includes('send submission') ||
                              task.taskName?.toLowerCase().includes('send follow-up');
      const isQuestionTask = task.sortOrder === 15 ||
                            task.taskName?.toLowerCase().includes('review flagged') ||
                            task.taskName?.toLowerCase().includes('underwriter questions');
      const hasDependencies = task.dependencies && task.dependencies.length > 0;

      if (isSubmissionTask) {
        interfaceType = 'email';
        source = 'inferred (submission task)';
      } else if (isQuestionTask) {
        interfaceType = 'chat + replies';
        source = 'inferred (question task)';
      } else if (hasDependencies || task.showDependencyArtifacts) {
        interfaceType = 'artifact';
        source = 'inferred (has dependencies)';
      } else {
        interfaceType = 'chat';
        source = 'inferred (default)';
      }
    }

    console.log(`\nTask: ${task.taskName}`);
    console.log(`  Sort Order: ${task.sortOrder}`);
    console.log(`  Interface Type: ${interfaceType}`);
    console.log(`  Source: ${source}`);
    if (task.dependencies.length > 0) {
      console.log(`  Dependencies: ${task.dependencies.length}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal tasks: ${tasks.length}`);

  // Summary
  const summary = {};
  tasks.forEach(task => {
    let interfaceType = task.interfaceType;
    if (!interfaceType) {
      const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 ||
                              task.taskName?.toLowerCase().includes('send submission') ||
                              task.taskName?.toLowerCase().includes('send follow-up');
      const isQuestionTask = task.sortOrder === 15 ||
                            task.taskName?.toLowerCase().includes('review flagged') ||
                            task.taskName?.toLowerCase().includes('underwriter questions');
      const hasDependencies = task.dependencies && task.dependencies.length > 0;

      if (isSubmissionTask) interfaceType = 'email';
      else if (isQuestionTask) interfaceType = 'chat + replies';
      else if (hasDependencies || task.showDependencyArtifacts) interfaceType = 'artifact';
      else interfaceType = 'chat';
    }
    summary[interfaceType] = (summary[interfaceType] || 0) + 1;
  });

  console.log('\n📊 Summary:');
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} tasks`);
  });
}

listWorkerCompTaskInterfaces()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
