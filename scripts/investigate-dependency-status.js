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

async function investigate() {
  const taskId = 'uvt9zQYGgm0dmEhYQ0a5';
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== INVESTIGATING TASK DEPENDENCY STATUS ===\n');
  
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('ERROR: Task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('Task:', task.taskName);
  console.log('Current Status:', task.status);
  console.log('Order:', task.order);
  console.log('Dependencies:', JSON.stringify(task.dependencies || []));
  console.log('');
  
  if (!task.dependencies || task.dependencies.length === 0) {
    console.log('No dependencies found. Task should be available immediately.');
    return;
  }
  
  console.log('=== CHECKING DEPENDENCIES ===\n');
  
  for (const depId of task.dependencies) {
    console.log('Dependency ID:', depId);
    
    // Check if it's a template ID - need to find the actual company task
    const tasksRef = collection(db, 'companyTasks');
    const q = query(tasksRef, 
      where('companyId', '==', companyId),
      where('templateId', '==', depId)
    );
    const depSnapshot = await getDocs(q);
    
    if (!depSnapshot.empty) {
      const depTask = depSnapshot.docs[0];
      const depData = depTask.data();
      console.log('  Found Task:', depData.taskName);
      console.log('  Task ID:', depTask.id);
      console.log('  Status:', depData.status);
      console.log('  Order:', depData.order);
      
      if (depData.status === 'completed') {
        console.log('  ✓ Dependency is COMPLETED');
      } else {
        console.log('  ✗ Dependency is NOT completed (status: ' + depData.status + ')');
      }
    } else {
      console.log('  ERROR: No matching company task found for template ID:', depId);
      
      // Try finding by document ID
      const directRef = doc(db, 'companyTasks', depId);
      const directDoc = await getDoc(directRef);
      if (directDoc.exists()) {
        const directData = directDoc.data();
        console.log('  Found by direct ID:', directData.taskName);
        console.log('  Status:', directData.status);
      }
    }
    console.log('');
  }
  
  // Check what should happen
  console.log('=== EXPECTED BEHAVIOR ===');
  console.log('When all dependencies are completed, task should automatically change to "Needs attention"');
  console.log('This happens via the AI completion endpoint calling the dependency update endpoint');
  console.log('');
  
  // Get the previous task (by order)
  const prevTaskQuery = query(
    collection(db, 'companyTasks'),
    where('companyId', '==', companyId),
    where('renewalType', '==', task.renewalType),
    where('order', '==', task.order - 1)
  );
  const prevTaskSnap = await getDocs(prevTaskQuery);
  
  if (!prevTaskSnap.empty) {
    const prevTask = prevTaskSnap.docs[0].data();
    console.log('=== PREVIOUS TASK (by order) ===');
    console.log('Task:', prevTask.taskName);
    console.log('Order:', prevTask.order);
    console.log('Status:', prevTask.status);
    console.log('Task ID:', prevTaskSnap.docs[0].id);
  }
}

investigate()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
