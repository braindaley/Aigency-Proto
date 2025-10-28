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

async function checkTaskConfig() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  
  console.log('Checking marketing email task configuration...\n');
  
  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('📋 Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Dependencies:', task.dependencies);
  console.log('  Interface Type:', task.interfaceType || 'not set');
  console.log('\n📝 System Prompt:');
  console.log('---');
  console.log(task.systemPrompt || 'No system prompt set');
  console.log('---');
  
  console.log('\n🎯 Test Criteria:');
  console.log('---');
  console.log(task.testCriteria || 'No test criteria set');
  console.log('---');
  
  // Check for prior tasks that might have attachments
  console.log('\n📎 Checking for potential attachment sources...');
  const allTasksSnapshot = await getDocs(query(
    collection(db, 'companyTasks'),
    where('companyId', '==', companyId),
    where('status', '==', 'completed')
  ));
  
  const tasksWithArtifacts = [];
  for (const taskDoc of allTasksSnapshot.docs) {
    const taskData = taskDoc.data();
    const artifactsSnapshot = await getDocs(query(
      collection(db, `companies/${companyId}/artifacts`),
      where('taskId', '==', taskDoc.id)
    ));
    
    if (artifactsSnapshot.size > 0) {
      tasksWithArtifacts.push({
        id: taskDoc.id,
        name: taskData.taskName,
        sortOrder: taskData.sortOrder,
        artifactCount: artifactsSnapshot.size
      });
    }
  }
  
  tasksWithArtifacts.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  
  console.log('\nCompleted tasks with artifacts (potential attachment sources):');
  tasksWithArtifacts.forEach(t => {
    console.log(`  [${t.sortOrder}] ${t.name} - ${t.artifactCount} artifact(s)`);
  });
}

checkTaskConfig().catch(console.error);
