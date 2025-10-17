const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function findAcord130Tasks() {
  console.log('=== FINDING ACORD 130 TASKS ===\n');

  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('taskName', '==', 'Prepare ACORD 130 Workers Compensation Application'));
  const snapshot = await getDocs(q);

  console.log('Found ' + snapshot.size + ' ACORD 130 tasks\n');

  snapshot.forEach(doc => {
    const task = doc.data();
    console.log('Task ID: ' + doc.id);
    console.log('  Company ID: ' + task.companyId);
    console.log('  Status: ' + task.status);
    console.log('  Created: ' + task.createdAt);
    console.log('  System Prompt Length: ' + (task.systemPrompt ? task.systemPrompt.length : 0) + ' chars');
    console.log('  Has JSON in prompt: ' + (task.systemPrompt && task.systemPrompt.toLowerCase().includes('json')));
    console.log('---');
  });
}

findAcord130Tasks()
  .then(() => process.exit(0))
  .catch(console.error);
