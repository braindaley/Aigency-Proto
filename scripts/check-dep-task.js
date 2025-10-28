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

async function checkDepTask() {
  const depTaskId = 'sKY8AVp6hj3pqZ957KTT';
  
  const taskDoc = await getDoc(doc(db, 'companyTasks', depTaskId));
  if (!taskDoc.exists()) {
    console.log('❌ Dependency task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('📋 Dependency Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Completed By:', task.completedBy);
  console.log('  Phase:', task.phase);
}

checkDepTask().catch(console.error);
