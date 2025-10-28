/**
 * Fix the marketing email task dependency and reset it for re-execution
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

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

async function fixMarketingTask() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const correctDependencyId = 'ijkbooN3Mg8bFv1sE4wT'; // The carrier search task

  console.log('Fixing marketing email task...\n');

  // Get task
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('❌ Task not found');
    return;
  }

  const task = taskDoc.data();
  console.log('📋 Current Task State:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Old Dependencies:', task.dependencies);

  // Update the task with correct dependency and reset status
  await updateDoc(taskRef, {
    dependencies: [correctDependencyId],
    status: 'available', // Reset to available so it can be re-run
    completedBy: null,
    completedDate: null
  });

  console.log('\n✅ Task Updated:');
  console.log('  New Dependencies:', [correctDependencyId]);
  console.log('  Status: available (ready to re-run)');

  console.log('\n📝 Next Steps:');
  console.log('  1. Navigate to the task in the UI');
  console.log('  2. Click "Complete with AI" to re-run the task');
  console.log('  3. The task should now create email submissions for each carrier');
}

fixMarketingTask().catch(console.error);
