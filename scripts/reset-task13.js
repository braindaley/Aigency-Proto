const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, query, where, getDocs, deleteDoc } = require('firebase/firestore');

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

async function resetTask13() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const task13Id = 'GwnjdfTi1JOPGBcpPWot';

  console.log('=== RESETTING TASK 13 ===\n');

  // 1. Delete all artifacts for this task
  console.log('1. Deleting old artifacts...');
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q1 = query(artifactsRef, where('taskId', '==', task13Id));
  const artifactsSnap = await getDocs(q1);

  let deletedArtifacts = 0;
  for (const doc of artifactsSnap.docs) {
    await deleteDoc(doc.ref);
    deletedArtifacts++;
  }
  console.log(`   ✅ Deleted ${deletedArtifacts} artifacts\n`);

  // 2. Delete all messages for this task
  console.log('2. Deleting old messages...');
  const messagesRef = collection(db, `companies/${companyId}/tasks/${task13Id}/messages`);
  const messagesSnap = await getDocs(messagesRef);

  let deletedMessages = 0;
  for (const doc of messagesSnap.docs) {
    await deleteDoc(doc.ref);
    deletedMessages++;
  }
  console.log(`   ✅ Deleted ${deletedMessages} messages\n`);

  // 3. Change task status back to "Needs attention"
  console.log('3. Resetting task status...');
  const taskRef = doc(db, 'companyTasks', task13Id);
  await updateDoc(taskRef, {
    status: 'Needs attention'
  });
  console.log('   ✅ Status changed to "Needs attention"\n');

  console.log('✅ TASK 13 RESET COMPLETE!\n');
  console.log('Next steps:');
  console.log('  1. Open Task 13: http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/tasks/GwnjdfTi1JOPGBcpPWot');
  console.log('  2. The task should now auto-execute with the updated prompt');
  console.log('  3. Wait for it to generate 5 follow-up emails');
  console.log('  4. Once complete, run: node scripts/retrigger-task14.js');
}

resetTask13().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
