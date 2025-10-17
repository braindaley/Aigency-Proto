const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function check() {
  const taskId = 'IuFlbSqoJsRw1HuQMhTA';
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CHECKING TASK-ARTIFACT LINK ===\n');
  console.log('Task ID:', taskId);
  
  // Check task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (taskDoc.exists()) {
    const task = taskDoc.data();
    console.log('Task Name:', task.taskName);
    console.log('Task has artifactId field:', task.artifactId || 'NO');
  }
  
  console.log('\n=== CHECKING ARTIFACTS ===\n');
  
  // Find artifacts for this task
  const artifactsRef = collection(db, 'companies', companyId, 'artifacts');
  const artifactsSnap = await getDocs(artifactsRef);
  
  const taskArtifacts = [];
  artifactsSnap.forEach(doc => {
    const data = doc.data();
    if (data.taskId === taskId) {
      taskArtifacts.push({
        id: doc.id,
        name: data.name,
        taskId: data.taskId,
        taskName: data.taskName,
        type: data.type,
        size: data.data ? data.data.length : 0
      });
    }
  });
  
  console.log('Artifacts found with taskId:', taskArtifacts.length);
  taskArtifacts.forEach(artifact => {
    console.log('\nArtifact:');
    console.log('  ID:', artifact.id);
    console.log('  Name:', artifact.name);
    console.log('  Task ID:', artifact.taskId);
    console.log('  Task Name:', artifact.taskName);
    console.log('  Type:', artifact.type);
    console.log('  Size:', artifact.size, 'chars');
  });
  
  if (taskArtifacts.length > 0) {
    console.log('\n=== ISSUE IDENTIFIED ===');
    console.log('Artifact exists but task page is not showing it.');
    console.log('The task page artifact viewer needs to find artifacts by taskId.');
  }
}

check()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
