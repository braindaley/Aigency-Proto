const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc, updateDoc } = require('firebase/firestore');

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

async function cleanTask13() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const task13Id = 'B10M67bZTVuuI5TFDjRz';

  console.log('\n=== Cleaning Task 13 ===\n');

  // Delete all artifacts for Task 13
  console.log('1. Deleting artifacts...');
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsQuery = query(artifactsRef, where('taskId', '==', task13Id));
  const artifactsSnapshot = await getDocs(artifactsQuery);

  console.log(`   Found ${artifactsSnapshot.size} artifacts to delete`);

  for (const artifactDoc of artifactsSnapshot.docs) {
    await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactDoc.id));
    console.log(`   ✓ Deleted artifact: ${artifactDoc.id}`);
  }

  // Delete all chat messages for Task 13
  console.log('\n2. Deleting chat messages...');
  const chatRef = collection(db, 'taskChats', task13Id, 'messages');
  const chatSnapshot = await getDocs(chatRef);

  console.log(`   Found ${chatSnapshot.size} messages to delete`);

  for (const msgDoc of chatSnapshot.docs) {
    await deleteDoc(doc(db, 'taskChats', task13Id, 'messages', msgDoc.id));
    console.log(`   ✓ Deleted message: ${msgDoc.id}`);
  }

  // Reset task status to pending
  console.log('\n3. Resetting task status...');
  const taskRef = doc(db, 'companyTasks', task13Id);
  await updateDoc(taskRef, {
    status: 'pending',
    updatedAt: new Date()
  });
  console.log('   ✓ Task status reset to pending');

  console.log('\n✨ Task 13 cleaned successfully!');
  console.log('\nNext steps:');
  console.log('1. Refresh the task page');
  console.log('2. Click "Regenerate document from template"');
  console.log('3. Should generate exactly 5 follow-up emails');

  process.exit(0);
}

cleanTask13().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
