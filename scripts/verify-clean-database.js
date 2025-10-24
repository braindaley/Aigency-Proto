/**
 * Verify database is clean after company deletion
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function verifyCleanDatabase() {
  console.log('🔍 Verifying database is clean...\n');

  const checks = [
    { name: 'Companies', collection: 'companies', expected: 0 },
    { name: 'Company Tasks', collection: 'companyTasks', expected: 0 },
    { name: 'AI Task Jobs', collection: 'aiTaskJobs', expected: 0 },
    { name: 'Task Chats', collection: 'taskChats', expected: 0 },
    { name: 'Task Templates', collection: 'tasks', expected: 152 }, // Should have templates
    { name: 'Marketing Files', collection: 'marketingFiles', expected: 'any' },
  ];

  let allClean = true;

  for (const check of checks) {
    const snapshot = await getDocs(collection(db, check.collection));
    const count = snapshot.size;

    const status = check.expected === 'any' 
      ? '✅' 
      : count === check.expected 
        ? '✅' 
        : '❌';

    const expectedText = check.expected === 'any' 
      ? `${count} (OK)` 
      : `${count} (expected ${check.expected})`;

    console.log(`${status} ${check.name}: ${expectedText}`);

    if (check.expected !== 'any' && count !== check.expected) {
      allClean = false;
    }
  }

  console.log('\n' + (allClean ? '✅ Database is clean!' : '⚠️ Database has unexpected data'));
}

verifyCleanDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
