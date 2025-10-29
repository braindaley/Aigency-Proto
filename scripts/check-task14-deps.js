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

async function checkTask14() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';
    const task14Id = 'YilhpZgWUxGLloeTWw6c';
    const task13Id = 'GwnjdfTi1JOPGBcpPWot';

    console.log('=== TASK 14 CONFIGURATION ===\n');

    const tasksRef = collection(db, `companies/${companyId}/companyTasks`);
    const q = query(tasksRef, where('id', '==', task14Id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Task 14 not found in companyTasks');
      return;
    }

    const taskDoc = snapshot.docs[0];
    const task = taskDoc.data();

    console.log('Task name:', task.taskName);
    console.log('Status:', task.status);
    console.log('Dependencies:', JSON.stringify(task.dependencies || [], null, 2));
    console.log('\nExpected dependency task ID:', task13Id);
    console.log('Does it match?', task.dependencies && task.dependencies.includes(task13Id));

    // Check Task 13 artifacts
    console.log('\n=== TASK 13 ARTIFACTS ===\n');
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQ = query(artifactsRef, where('taskId', '==', task13Id));
    const artifactsSnapshot = await getDocs(artifactsQ);

    console.log(`Found ${artifactsSnapshot.size} artifacts for Task 13`);
    let idx = 0;
    artifactsSnapshot.forEach((doc) => {
      idx++;
      const data = doc.data();
      const carrier = data.carrierName || data.artifactId || 'Unknown';
      const contentLen = (data.data || '').length;
      console.log(`\n${idx}. ${data.name}`);
      console.log(`   Carrier: ${carrier}`);
      console.log(`   Content length: ${contentLen} chars`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTask14().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
