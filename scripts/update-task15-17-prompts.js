const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyAPbristGE8ytc59RD-KL0JMJL-EuVW23R8",
  authDomain: "aigency-mvp.firebaseapp.com",
  projectId: "aigency-mvp",
  storageBucket: "aigency-mvp.firebasestorage.app",
  messagingSenderId: "326368003305",
  appId: "1:326368003305:web:0c95f9e94ed99f4ac27bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateTaskPrompts() {
  console.log('\n=== Updating Task 15-17 System Prompts in Firestore ===\n');

  // Load the workers-comp-tasks-complete.json file
  const tasksFile = path.join(__dirname, '..', 'workers-comp-tasks-complete.json');
  const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

  // Find tasks 15, 16, 17 by sortOrder
  const task15 = tasksData.find(t => t.sortOrder === 15);
  const task16 = tasksData.find(t => t.sortOrder === 16);
  const task17 = tasksData.find(t => t.sortOrder === 17);

  if (!task15 || !task16 || !task17) {
    console.error('❌ Could not find all tasks (15, 16, 17) in the JSON file');
    process.exit(1);
  }

  console.log('Found tasks to update:');
  console.log(`  Task 15: ${task15.taskName} (ID: ${task15.id})`);
  console.log(`  Task 16: ${task16.taskName} (ID: ${task16.id})`);
  console.log(`  Task 17: ${task17.taskName} (ID: ${task17.id})`);

  // Update Task 15 in Firestore
  console.log('\n🔄 Updating Task 15 template...');
  const task15Ref = doc(db, 'taskTemplates', task15.id);
  await updateDoc(task15Ref, {
    systemPrompt: task15.systemPrompt,
    testCriteria: task15.testCriteria,
    updatedAt: new Date()
  });
  console.log('✅ Task 15 template updated');

  // Update Task 16 in Firestore
  console.log('\n🔄 Updating Task 16 template...');
  const task16Ref = doc(db, 'taskTemplates', task16.id);
  await updateDoc(task16Ref, {
    systemPrompt: task16.systemPrompt,
    testCriteria: task16.testCriteria,
    updatedAt: new Date()
  });
  console.log('✅ Task 16 template updated');

  // Update Task 17 in Firestore
  console.log('\n🔄 Updating Task 17 template...');
  const task17Ref = doc(db, 'taskTemplates', task17.id);
  await updateDoc(task17Ref, {
    systemPrompt: task17.systemPrompt,
    testCriteria: task17.testCriteria,
    updatedAt: new Date()
  });
  console.log('✅ Task 17 template updated');

  console.log('\n✅ All task templates updated successfully!');
  process.exit(0);
}

updateTaskPrompts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
