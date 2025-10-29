const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function findTask14() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';
    const task14Id = 'YilhpZgWUxGLloeTWw6c';

    console.log('=== SEARCHING FOR TASK 14 ===\n');

    // Try getting it directly as a document
    const taskDocRef = doc(db, `companies/${companyId}/companyTasks`, task14Id);
    const taskDocSnap = await getDoc(taskDocRef);

    if (taskDocSnap.exists()) {
      const task = taskDocSnap.data();
      console.log('Found Task 14 (by doc ID)!');
      console.log('Task name:', task.taskName);
      console.log('Status:', task.status);
      console.log('Dependencies:', JSON.stringify(task.dependencies || [], null, 2));
    } else {
      console.log('Not found by doc ID. Listing all tasks...\n');

      const tasksRef = collection(db, `companies/${companyId}/companyTasks`);
      const snapshot = await getDocs(tasksRef);

      console.log(`Found ${snapshot.size} tasks total\n`);
      snapshot.forEach((doc) => {
        const data = doc.data();
        const sortOrder = data.sortOrder || 'N/A';
        console.log(`${sortOrder}. ${data.taskName} (${doc.id})`);
        if (data.taskName && data.taskName.includes('follow-up')) {
          console.log('   ^ This looks like Task 14!');
          console.log('   Dependencies:', JSON.stringify(data.dependencies || []));
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTask14().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
