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

async function updateTasksToUpcoming() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';

    console.log('=== UPDATING TASKS 15-41 TO UPCOMING ===\n');

    // Get all tasks for this company
    const tasksRef = collection(db, 'companyTasks');
    const q = query(tasksRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    // Filter tasks with sortOrder between 15 and 41
    const tasksToUpdate = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const sortOrder = data.sortOrder;
      if (sortOrder >= 15 && sortOrder <= 41) {
        tasksToUpdate.push({
          id: docSnap.id,
          sortOrder: sortOrder,
          taskName: data.taskName,
          currentStatus: data.status
        });
      }
    });

    // Sort by sortOrder
    tasksToUpdate.sort((a, b) => a.sortOrder - b.sortOrder);

    console.log(`Found ${tasksToUpdate.length} tasks to update:\n`);

    // Update each task
    let updated = 0;
    for (const task of tasksToUpdate) {
      console.log(`${task.sortOrder}. ${task.taskName}`);
      console.log(`   Current status: ${task.currentStatus} → Upcoming`);

      const taskDocRef = doc(db, 'companyTasks', task.id);
      await updateDoc(taskDocRef, {
        status: 'Upcoming'
      });

      updated++;
    }

    console.log(`\n✅ Updated ${updated} tasks to "Upcoming" status`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

updateTasksToUpcoming().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
