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

async function checkCarrierResearch() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking for carrier research task and data...\n');

  // Find carrier research task
  const tasksRef = collection(db, 'companyTasks');
  const tasksQuery = query(
    tasksRef,
    where('companyId', '==', companyId)
  );
  const tasksSnapshot = await getDocs(tasksQuery);

  const carrierTasks = tasksSnapshot.docs.filter(doc => {
    const taskName = doc.data().taskName.toLowerCase();
    return taskName.includes('carrier') && (taskName.includes('research') || taskName.includes('select'));
  });

  if (carrierTasks.length === 0) {
    console.log('No carrier research task found');
    return;
  }

  for (const taskDoc of carrierTasks) {
    const task = taskDoc.data();
    console.log('📋 Task:', task.taskName);
    console.log('   ID:', taskDoc.id);
    console.log('   Status:', task.status);

    // Get artifacts for this task
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQuery = query(artifactsRef, where('taskId', '==', taskDoc.id));
    const artifactsSnapshot = await getDocs(artifactsQuery);

    console.log(`   Artifacts: ${artifactsSnapshot.size}\n`);

    artifactsSnapshot.forEach((artifactDoc, idx) => {
      const data = artifactDoc.data();
      console.log(`   📄 Artifact ${idx + 1}:`);
      console.log('      Name:', data.name);
      console.log('      Content preview (first 800 chars):');
      console.log('      ---');
      console.log('      ' + (data.data || '').substring(0, 800).replace(/\n/g, '\n      '));
      console.log('      ---\n');

      // Look for email addresses
      const emails = (data.data || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emails) {
        console.log('      📧 Emails found:', emails);
        console.log('');
      }
    });
  }
}

checkCarrierResearch().catch(console.error);
