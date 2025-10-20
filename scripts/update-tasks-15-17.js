const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');
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

async function updateTasks() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';

  console.log('\n=== Updating Tasks 15, 16, 17 System Prompts ===\n');

  // Load the workers-comp-tasks-complete.json file
  const tasksFile = path.join(__dirname, '..', 'workers-comp-tasks-complete.json');
  const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

  // Find tasks 15, 16, 17 by sortOrder
  const task15Template = tasksData.find(t => t.sortOrder === 15);
  const task16Template = tasksData.find(t => t.sortOrder === 16);
  const task17Template = tasksData.find(t => t.sortOrder === 17);

  if (!task15Template || !task16Template || !task17Template) {
    console.error('❌ Could not find all tasks (15, 16, 17) in the JSON file');
    process.exit(1);
  }

  console.log('Found task templates:');
  console.log(`  Task 15: ${task15Template.taskName}`);
  console.log(`  Task 16: ${task16Template.taskName}`);
  console.log(`  Task 17: ${task17Template.taskName}`);

  // Get all company tasks
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  const companyTasks = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.sortOrder === 15 || data.sortOrder === 16 || data.sortOrder === 17) {
      companyTasks.push({ id: doc.id, ...data });
    }
  });

  console.log(`\nFound ${companyTasks.length} company tasks to update`);

  for (const task of companyTasks) {
    let template;
    if (task.sortOrder === 15) template = task15Template;
    else if (task.sortOrder === 16) template = task16Template;
    else if (task.sortOrder === 17) template = task17Template;

    if (!template) continue;

    console.log(`\n🔄 Updating Task ${task.sortOrder}: ${task.taskName}`);
    console.log(`   ID: ${task.id}`);

    const taskRef = doc(db, 'companyTasks', task.id);
    await updateDoc(taskRef, {
      systemPrompt: template.systemPrompt,
      testCriteria: template.testCriteria,
      updatedAt: new Date()
    });

    console.log(`✅ Task ${task.sortOrder} updated successfully`);
  }

  console.log('\n✅ All tasks updated!');
  process.exit(0);
}

updateTasks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
