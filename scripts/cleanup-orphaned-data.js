/**
 * Cleanup orphaned data from deleted companies
 *
 * This script finds and deletes data that should have been cascade-deleted
 * when companies were deleted but wasn't due to incomplete deletion logic.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCzT_CU_bVIWcxU7p9-gPTI-QbFHqGJj5s",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1072219612856",
  appId: "1:1072219612856:web:c6fccfd12a47e79b37cb49",
  measurementId: "G-J5XPQRJ0RZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupOrphanedData() {
  console.log('🔍 Starting orphaned data cleanup...\n');

  // 1. Get all existing company IDs
  console.log('📋 Fetching existing companies...');
  const companiesSnapshot = await getDocs(collection(db, 'companies'));
  const validCompanyIds = new Set(companiesSnapshot.docs.map(doc => doc.id));
  console.log(`✅ Found ${validCompanyIds.size} valid companies\n`);

  let totalDeleted = 0;

  // 2. Clean up orphaned companyTasks
  console.log('🧹 Cleaning up orphaned company tasks...');
  const tasksSnapshot = await getDocs(collection(db, 'companyTasks'));
  const orphanedTasks = tasksSnapshot.docs.filter(doc => {
    const companyId = doc.data().companyId;
    return companyId && !validCompanyIds.has(companyId);
  });

  console.log(`   Found ${orphanedTasks.length} orphaned tasks`);
  const taskIds = [];

  for (const taskDoc of orphanedTasks) {
    taskIds.push(taskDoc.id);
    await deleteDoc(doc(db, 'companyTasks', taskDoc.id));
    totalDeleted++;
  }
  console.log(`   ✅ Deleted ${orphanedTasks.length} orphaned tasks\n`);

  // 3. Clean up taskChats for deleted tasks
  console.log('🧹 Cleaning up task chats...');
  const taskChatsSnapshot = await getDocs(collection(db, 'taskChats'));
  let chatMessagesDeleted = 0;

  for (const chatDoc of taskChatsSnapshot.docs) {
    const taskId = chatDoc.id;

    // Delete if task doesn't exist anymore
    if (taskIds.includes(taskId)) {
      const messagesSnapshot = await getDocs(collection(db, 'taskChats', taskId, 'messages'));

      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(doc(db, 'taskChats', taskId, 'messages', messageDoc.id));
        chatMessagesDeleted++;
      }

      await deleteDoc(doc(db, 'taskChats', taskId));
      totalDeleted++;
    }
  }
  console.log(`   ✅ Deleted ${taskChatsSnapshot.docs.length} task chat collections and ${chatMessagesDeleted} messages\n`);

  // 4. Clean up aiTaskJobs for deleted tasks
  console.log('🧹 Cleaning up AI task jobs...');
  const jobsSnapshot = await getDocs(collection(db, 'aiTaskJobs'));
  let orphanedJobs = 0;

  for (const jobDoc of jobsSnapshot.docs) {
    const taskId = jobDoc.data().taskId;

    if (taskId && taskIds.includes(taskId)) {
      await deleteDoc(doc(db, 'aiTaskJobs', jobDoc.id));
      orphanedJobs++;
      totalDeleted++;
    }
  }
  console.log(`   ✅ Deleted ${orphanedJobs} orphaned AI task jobs\n`);

  console.log(`\n✅ CLEANUP COMPLETE!`);
  console.log(`   Total items deleted: ${totalDeleted}`);
  console.log(`   - ${orphanedTasks.length} company tasks`);
  console.log(`   - ${taskChatsSnapshot.docs.length} task chat collections (${chatMessagesDeleted} messages)`);
  console.log(`   - ${orphanedJobs} AI task jobs`);
}

cleanupOrphanedData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  });
