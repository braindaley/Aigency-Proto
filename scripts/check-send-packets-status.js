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

async function check() {
  const taskRef = doc(db, 'companyTasks', 'IuFlbSqoJsRw1HuQMhTA');
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('Task: Send submission packets');
  console.log('Status:', task.status);
  console.log('Dependencies:', task.dependencies);
  console.log('Tag:', task.tag);
}

check()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
