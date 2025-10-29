const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc } = require('firebase/firestore');

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

async function deleteTask14Submissions() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';
    const task14Id = 'YilhpZgWUxGLloeTWw6c';

    console.log('=== DELETING TASK 14 SUBMISSIONS ===\n');

    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const q = query(submissionsRef, where('taskId', '==', task14Id));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} submissions to delete\n`);

    let deleted = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`Deleting: ${data.carrierName || 'Unknown'} (${doc.id})`);
      await deleteDoc(doc.ref);
      deleted++;
    }

    console.log(`\n✅ Deleted ${deleted} submissions`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

deleteTask14Submissions().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
