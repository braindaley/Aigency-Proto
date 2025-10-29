const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkTask13() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';
    const task13CompanyTaskId = 'GwnjdfTi1JOPGBcpPWot';
    const task13TemplateId = 'XajTm0iTsvZX4RIXGmD6';

    console.log('=== TASK 13 IDS ===\n');

    // Find Task 13 in companyTasks
    const tasksRef = collection(db, 'companyTasks');
    const q = query(tasksRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    console.log('Searching for Task 13 "Draft follow-up emails"...\n');

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.taskName && data.taskName.includes('Draft follow-up')) {
        console.log('Found Task 13!');
        console.log('  Document ID:', doc.id);
        console.log('  Task ID field:', data.id);
        console.log('  Template ID:', data.templateId);
        console.log('  Task name:', data.taskName);
        console.log('  Sort order:', data.sortOrder);
        console.log('');

        console.log('Expected IDs:');
        console.log('  Company task ID:', task13CompanyTaskId);
        console.log('  Template ID:', task13TemplateId);
        console.log('');

        console.log('Matches:');
        console.log('  Doc ID matches company task ID?', doc.id === task13CompanyTaskId);
        console.log('  Template ID matches expected?', data.templateId === task13TemplateId);
      }
    });

    // Check artifacts
    console.log('\n=== TASK 13 ARTIFACTS ===\n');

    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQ = query(artifactsRef, where('taskId', '==', task13CompanyTaskId));
    const artifactsSnap = await getDocs(artifactsQ);

    console.log(`Artifacts with taskId = ${task13CompanyTaskId}: ${artifactsSnap.size}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTask13().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
