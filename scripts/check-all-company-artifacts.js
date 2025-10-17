const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkAllArtifacts() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CHECKING ALL COMPANY ARTIFACTS ===\n');
  console.log('Company ID:', companyId);
  
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsSnapshot = await getDocs(artifactsRef);
  
  console.log('\nTotal artifacts:', artifactsSnapshot.size);
  
  if (artifactsSnapshot.size === 0) {
    console.log('\nNo artifacts found for this company.');
    return;
  }
  
  console.log('\nArtifacts found:\n');
  
  const artifacts = artifactsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  artifacts.sort((a, b) => (a.taskName || '').localeCompare(b.taskName || ''));
  
  let count = 1;
  for (const artifact of artifacts) {
    console.log(`${count}. ${artifact.name || 'Unnamed'}`);
    console.log(`   Task: ${artifact.taskName || 'N/A'}`);
    console.log(`   Task ID: ${artifact.taskId || 'N/A'}`);
    console.log(`   Type: ${artifact.type || 'N/A'}`);
    console.log(`   Size: ${artifact.data?.length || 0} characters`);
    console.log(`   Tags: ${artifact.tags?.join(', ') || 'None'}`);
    if (artifact.data) {
      console.log(`   Preview: ${artifact.data.substring(0, 100).trim()}...`);
    }
    console.log('');
    count++;
  }
  
  console.log('\n=== CHECKING COMPANY TASKS ===\n');
  const tasksRef = collection(db, 'companyTasks');
  const tasksQuery = query(tasksRef, where('companyId', '==', companyId));
  const tasksSnapshot = await getDocs(tasksQuery);
  
  const tasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  const wcTasks = tasks
    .filter(t => t.renewalType === 'workers-comp')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  console.log('Workers Comp Tasks:');
  for (const task of wcTasks) {
    console.log(`  ${task.order}. ${task.taskName} - ${task.status}`);
  }
}

checkAllArtifacts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
