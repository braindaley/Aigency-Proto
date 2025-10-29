const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

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

async function updateTask26() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';

    console.log('=== UPDATING TASK 26 TO UPCOMING ===\n');

    // Get all tasks for this company
    const tasksRef = collection(db, 'companyTasks');
    const q = query(tasksRef, where('companyId', '==', companyId), where('sortOrder', '==', 26));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Task 26 not found');
      return;
    }

    const taskDoc = snapshot.docs[0];
    const data = taskDoc.data();

    console.log(`Task: ${data.taskName}`);
    console.log(`Current status: ${data.status}`);

    const taskDocRef = doc(db, 'companyTasks', taskDoc.id);
    await updateDoc(taskDocRef, {
      status: 'Upcoming'
    });

    console.log(`✅ Updated to: Upcoming`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateTask26().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
