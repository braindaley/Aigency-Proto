const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkTaskDep() {
  const depTaskId = 'tgKQBvbrpPeYoUALo85d';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking dependency task...\n');

  const taskDoc = await getDoc(doc(db, 'companyTasks', depTaskId));
  if (!taskDoc.exists()) {
    console.log('❌ Dependency task not found');
    return;
  }

  const task = taskDoc.data();
  console.log('📋 Dependency Task:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Sort Order:', task.sortOrder);

  // Check artifacts
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsQuery = query(artifactsRef, where('taskId', '==', depTaskId));
  const artifactsSnapshot = await getDocs(artifactsQuery);

  console.log(`\n📦 Artifacts: ${artifactsSnapshot.size}`);

  artifactsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\n  ${doc.id}`);
    console.log(`    Name: ${data.name}`);
    console.log(`    Content length: ${(data.data || '').length}`);
    console.log(`    Preview: ${(data.data || '').substring(0, 200)}`);
  });
}

checkTaskDep().catch(console.error);
