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

async function getTaskDependencies() {
  const taskRef = doc(db, 'tasks', 'sKY8AVp6hj3pqZ957KTT');
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }
  
  const data = taskDoc.data();
  console.log('=== TASK DEPENDENCIES ===');
  console.log(JSON.stringify(data.dependencies || [], null, 2));
}

getTaskDependencies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
