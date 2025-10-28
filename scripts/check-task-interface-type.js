const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function checkInterfaceType() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  
  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  const task = taskDoc.data();
  
  console.log('Task:', task.taskName);
  console.log('Sort Order:', task.sortOrder);
  console.log('Interface Type:', task.interfaceType || 'NOT SET');
  console.log('Has Dependencies:', (task.dependencies || []).length > 0);
  console.log('Show Dependency Artifacts:', task.showDependencyArtifacts);
  
  // Determine which component will be used (from page.tsx logic)
  const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 || 
                          task.taskName?.toLowerCase().includes('send submission') || 
                          task.taskName?.toLowerCase().includes('send follow-up');
  const hasDependencies = task.dependencies && task.dependencies.length > 0;
  
  let interfaceType = task.interfaceType;
  if (!interfaceType) {
    if (isSubmissionTask) {
      interfaceType = 'email';
    } else if (hasDependencies || task.showDependencyArtifacts) {
      interfaceType = 'artifact';
    } else {
      interfaceType = 'chat';
    }
  }
  
  console.log('\nDetermined Interface Type:', interfaceType);
  console.log('Component that will render:', interfaceType === 'email' ? 'TaskDependencyArtifacts (isEmailTask=true)' : 
              interfaceType === 'artifact' ? 'TaskDependencyArtifacts' : 'TaskAIArtifacts');
}

checkInterfaceType().catch(console.error);
