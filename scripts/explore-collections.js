const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function exploreCollections() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';
    const task14Id = 'YilhpZgWUxGLloeTWw6c';

    console.log('=== EXPLORING COLLECTIONS ===\n');

    // Check companyTasks collection at root level
    console.log('1. Root companyTasks collection:');
    const rootTasksRef = collection(db, 'companyTasks');
    const rootTasksQ = query(rootTasksRef, where('companyId', '==', companyId));
    const rootTasksSnap = await getDocs(rootTasksQ);
    console.log(`   Found ${rootTasksSnap.size} tasks`);
    if (rootTasksSnap.size > 0) {
      rootTasksSnap.forEach(doc => {
        const data = doc.data();
        const isTask14 = doc.id === task14Id;
        console.log(`   - ${data.sortOrder || '?'}. ${data.taskName} (${doc.id})${isTask14 ? ' ← TASK 14' : ''}`);
        if (isTask14) {
          console.log(`     Dependencies: ${JSON.stringify(data.dependencies || [])}`);
        }
      });
    }

    console.log('\n2. Nested companies/{companyId}/companyTasks:');
    const nestedTasksRef = collection(db, `companies/${companyId}/companyTasks`);
    const nestedTasksSnap = await getDocs(nestedTasksRef);
    console.log(`   Found ${nestedTasksSnap.size} tasks`);

    console.log('\n3. Check submissions:');
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const submissionsQ = query(submissionsRef, where('taskId', '==', task14Id));
    const submissionsSnap = await getDocs(submissionsQ);
    console.log(`   Found ${submissionsSnap.size} submissions for Task 14`);
    if (submissionsSnap.size > 0) {
      console.log('   Submissions:');
      submissionsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.carrierName || 'Unknown carrier'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

exploreCollections().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
