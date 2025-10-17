/**
 * Reset the ACORD 125 task and clean its chat
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, getDocs, deleteDoc } = require('firebase/firestore');

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

const taskId = '0DL0g4DjJXmCkT02hm3f';
const companyId = 'qsu1QXPB8TUK2P4QyDiy';

async function resetTask() {
  console.log('=== RESETTING ACORD 125 TASK ===\n');

  // Reset task status
  const taskRef = doc(db, 'companyTasks', taskId);
  await updateDoc(taskRef, {
    status: 'Needs attention',
    completedAt: null,
    updatedAt: new Date().toISOString()
  });

  console.log('✅ Task status reset to "Needs attention"');

  // Clear chat messages
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnapshot = await getDocs(chatRef);

  console.log(`\nDeleting ${chatSnapshot.docs.length} chat messages...`);

  for (const msgDoc of chatSnapshot.docs) {
    await deleteDoc(msgDoc.ref);
  }

  console.log('✅ Chat messages cleared');

  // Clear the artifact
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsSnapshot = await getDocs(artifactsRef);

  console.log(`\nChecking ${artifactsSnapshot.docs.length} artifacts...`);

  for (const artifactDoc of artifactsSnapshot.docs) {
    const artifactData = artifactDoc.data();
    if (artifactData.taskId === taskId || artifactData.name?.includes('ACORD 125')) {
      console.log(`  Deleting artifact: ${artifactData.name}`);
      await deleteDoc(artifactDoc.ref);
    }
  }

  console.log('✅ Old artifacts cleared');
}

resetTask()
  .then(() => {
    console.log('\n=== RESET COMPLETE ===');
    console.log('\nThe task is now ready to be re-run with the correct markdown format.');
    console.log('Navigate to: http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/0DL0g4DjJXmCkT02hm3f');
    console.log('Click "Complete Task with AI" to generate a new ACORD 125 in markdown format.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
