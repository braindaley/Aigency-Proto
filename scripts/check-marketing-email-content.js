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

async function checkMarketingArtifacts() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking marketing email artifacts...\n');

  // Find the marketing email task
  const tasksRef = collection(db, 'companyTasks');
  const tasksQuery = query(
    tasksRef,
    where('companyId', '==', companyId),
    where('taskName', '==', 'Create marketing emails')
  );
  const tasksSnapshot = await getDocs(tasksQuery);

  if (tasksSnapshot.empty) {
    console.log('Marketing email task not found');
    return;
  }

  const marketingTaskId = tasksSnapshot.docs[0].id;
  console.log('Marketing Task ID:', marketingTaskId);

  // Get artifacts for this task
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsQuery = query(artifactsRef, where('taskId', '==', marketingTaskId));
  const artifactsSnapshot = await getDocs(artifactsQuery);

  console.log(`\nFound ${artifactsSnapshot.size} artifacts:\n`);

  artifactsSnapshot.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`\n📄 Artifact ${idx + 1}:`);
    console.log('   Carrier Name:', data.carrierName || data.name);
    console.log('   Content preview (first 500 chars):');
    console.log('   ---');
    console.log('   ' + (data.data || '').substring(0, 500).replace(/\n/g, '\n   '));
    console.log('   ---');

    // Try to extract email
    const emailMatch = (data.data || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    console.log('   Email found in content:', emailMatch ? emailMatch[0] : 'NONE');
  });
}

checkMarketingArtifacts().catch(console.error);
