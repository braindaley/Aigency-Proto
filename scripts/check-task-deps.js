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

async function getTask() {
  const taskRef = doc(db, 'tasks', 'uAqsk1Hcbzerb6oriO49');
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }

  const task = taskDoc.data();
  console.log('Task Name:', task.taskName);
  console.log('Dependencies:', JSON.stringify(task.dependencies, null, 2));
  console.log('Number of dependencies:', task.dependencies ? task.dependencies.length : 0);
}

getTask().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
