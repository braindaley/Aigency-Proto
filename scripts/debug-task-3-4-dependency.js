/**
 * Debug task 3 -> task 4 dependency issue
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function debugDependency() {
  const companyId = 'hkDZmFfhLVy7cAqxdfsz';
  const task3DocId = 'XUvnwH26Xgx67tHoS3aP';

  console.log('=== DEBUGGING TASK 3 -> TASK 4 DEPENDENCY ===\n');

  // Get task 3 details
  const task3Ref = doc(db, 'companyTasks', task3DocId);
  const task3Snap = await getDoc(task3Ref);
  const task3Data = task3Snap.data();

  console.log('TASK 3 (Completed):');
  console.log('  - Document ID:', task3DocId);
  console.log('  - Template ID:', task3Data.templateId);
  console.log('  - Task Name:', task3Data.taskName);
  console.log('  - Status:', task3Data.status);
  console.log('');

  // Get all tasks and find task 4
  const tasksRef = collection(db, 'companyTasks');
  const snapshot = await getDocs(tasksRef);

  console.log('SEARCHING FOR DEPENDENT TASKS...\n');

  const completedTemplateId = task3Data.templateId;

  snapshot.docs.forEach(taskDoc => {
    const data = taskDoc.data();
    if (!data.dependencies || !Array.isArray(data.dependencies)) {
      return;
    }

    // Check if this task depends on task 3
    const dependsOnDocId = data.dependencies.includes(task3DocId);
    const dependsOnTemplateId = data.dependencies.includes(completedTemplateId);
    const dependsOnTemplateIdString = data.dependencies.includes(String(completedTemplateId));

    const isDependent = dependsOnDocId || dependsOnTemplateId || dependsOnTemplateIdString;

    if (isDependent || data.sortOrder === 4) {
      console.log(`Task: "${data.taskName}" (sortOrder: ${data.sortOrder})`);
      console.log(`  - ID: ${taskDoc.id}`);
      console.log(`  - Status: ${data.status}`);
      console.log(`  - Dependencies: ${JSON.stringify(data.dependencies)}`);
      console.log(`  - Matches by doc ID: ${dependsOnDocId}`);
      console.log(`  - Matches by template ID: ${dependsOnTemplateId}`);
      console.log(`  - Matches by template ID (string): ${dependsOnTemplateIdString}`);
      console.log(`  - IS DEPENDENT: ${isDependent ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }
  });

  console.log('\n=== SIMULATING DEPENDENCY CHECK ===\n');

  // Simulate what checkAllDependenciesCompleted would do for task 4
  const task4 = snapshot.docs.find(d => d.data().sortOrder === 4);
  if (task4) {
    const task4Data = task4.data();
    console.log(`Checking if all dependencies are met for task 4: "${task4Data.taskName}"`);
    console.log(`Dependencies: ${JSON.stringify(task4Data.dependencies)}`);
    console.log('');

    for (const depId of task4Data.dependencies) {
      console.log(`  Checking dependency: ${depId}`);

      // Try to find by document ID
      let depDocRef = doc(db, 'companyTasks', depId);
      let depSnapshot = await getDoc(depDocRef);

      if (!depSnapshot.exists()) {
        console.log(`    ❌ Not found by document ID`);

        // Try to find by template ID
        const matchingTask = snapshot.docs.find(taskDoc => {
          const taskData = taskDoc.data();
          return (taskData.templateId === depId || String(taskData.templateId) === depId) &&
                 taskData.companyId === companyId;
        });

        if (!matchingTask) {
          console.log(`    ❌ Not found by template ID either`);
        } else {
          console.log(`    ✅ Found by template ID: ${matchingTask.id}`);
          const matchedData = matchingTask.data();
          console.log(`    Task: "${matchedData.taskName}"`);
          console.log(`    Status: ${matchedData.status}`);
          console.log(`    Completed: ${matchedData.status === 'completed' ? '✅ YES' : '❌ NO'}`);
        }
      } else {
        console.log(`    ✅ Found by document ID`);
        const depData = depSnapshot.data();
        console.log(`    Task: "${depData.taskName}"`);
        console.log(`    Status: ${depData.status}`);
        console.log(`    Completed: ${depData.status === 'completed' ? '✅ YES' : '❌ NO'}`);
      }
      console.log('');
    }
  }
}

debugDependency()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
