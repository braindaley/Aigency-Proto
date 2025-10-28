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

async function getTaskInfo() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba';
  
  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('Task Name:', task.taskName);
  console.log('Sort Order:', task.sortOrder);
  console.log('Status:', task.status);
  console.log('Dependencies:', task.dependencies);
}

getTaskInfo().catch(console.error);
