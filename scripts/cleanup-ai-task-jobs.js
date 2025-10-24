/**
 * Cleanup orphaned AI task jobs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function cleanupAITaskJobs() {
  console.log('🔍 Checking AI task jobs...\n');

  // Get all AI task jobs
  const jobsSnapshot = await getDocs(collection(db, 'aiTaskJobs'));
  console.log(`Found ${jobsSnapshot.size} AI task jobs`);

  if (jobsSnapshot.size === 0) {
    console.log('✅ No AI task jobs to clean up');
    return;
  }

  // Sample first few to understand the data
  console.log('\nSample jobs:');
  jobsSnapshot.docs.slice(0, 3).forEach(doc => {
    const data = doc.data();
    console.log(`  - Job ${doc.id}:`);
    console.log(`    taskId: ${data.taskId}`);
    console.log(`    companyId: ${data.companyId}`);
    console.log(`    status: ${data.status}`);
  });

  // Get all valid companies (should be 0)
  const companiesSnapshot = await getDocs(collection(db, 'companies'));
  const validCompanyIds = new Set(companiesSnapshot.docs.map(doc => doc.id));
  console.log(`\nFound ${validCompanyIds.size} valid companies`);

  // Get all valid tasks (should be 0)
  const tasksSnapshot = await getDocs(collection(db, 'companyTasks'));
  const validTaskIds = new Set(tasksSnapshot.docs.map(doc => doc.id));
  console.log(`Found ${validTaskIds.size} valid tasks\n`);

  // Delete all orphaned jobs
  let deleted = 0;
  for (const jobDoc of jobsSnapshot.docs) {
    const data = jobDoc.data();
    const isOrphaned = !validCompanyIds.has(data.companyId) || !validTaskIds.has(data.taskId);

    if (isOrphaned) {
      await deleteDoc(doc(db, 'aiTaskJobs', jobDoc.id));
      deleted++;
    }
  }

  console.log(`✅ Deleted ${deleted} orphaned AI task jobs`);
}

cleanupAITaskJobs()
  .then(() => {
    console.log('\n✅ Cleanup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
