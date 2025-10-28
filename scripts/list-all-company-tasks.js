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

async function listAllTasks() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('All tasks for company:\n');

  const tasksRef = collection(db, 'companyTasks');
  const tasksQuery = query(tasksRef, where('companyId', '==', companyId));
  const tasksSnapshot = await getDocs(tasksQuery);

  // Sort by sortOrder
  const tasks = tasksSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

  tasks.forEach((task, idx) => {
    console.log(`${idx + 1}. ${task.taskName}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Sort Order: ${task.sortOrder}`);
    console.log(`   Interface: ${task.interfaceType || 'not set'}`);
    console.log('');
  });
}

listAllTasks().catch(console.error);
