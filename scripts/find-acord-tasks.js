const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function findAcordTasks() {
  console.log('=== FINDING ALL ACORD TASKS ===\n');

  const tasksRef = collection(db, 'companyTasks');
  const snapshot = await getDocs(tasksRef);

  const acordTasks = [];
  snapshot.forEach(doc => {
    const task = doc.data();
    if (task.taskName && task.taskName.includes('ACORD 130')) {
      acordTasks.push({ id: doc.id, ...task });
    }
  });

  console.log('Found ' + acordTasks.length + ' ACORD 130 tasks\n');

  acordTasks.forEach(task => {
    console.log('Task ID: ' + task.id);
    console.log('  Company ID: ' + task.companyId);
    console.log('  Task Name: ' + task.taskName);
    console.log('  Status: ' + task.status);
    console.log('  System Prompt Length: ' + (task.systemPrompt ? task.systemPrompt.length : 0) + ' chars');
    console.log('  Has JSON in prompt: ' + (task.systemPrompt && task.systemPrompt.toLowerCase().includes('json')));
    console.log('---');
  });
}

findAcordTasks()
  .then(() => process.exit(0))
  .catch(console.error);
