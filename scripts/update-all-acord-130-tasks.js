const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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

async function updateAllAcord130Tasks() {
  console.log('=== UPDATING ALL ACORD 130 TASKS ===\n');

  // Read the enhanced system prompt
  const promptPath = path.join(__dirname, '..', 'acord-130-system-prompt.txt');
  const enhancedPrompt = fs.readFileSync(promptPath, 'utf8');

  // Find all ACORD 130 tasks
  const tasksRef = collection(db, 'companyTasks');
  const snapshot = await getDocs(tasksRef);

  const updates = [];
  snapshot.forEach(doc => {
    const task = doc.data();
    if (task.taskName && task.taskName.includes('ACORD 130')) {
      updates.push({
        id: doc.id,
        taskName: task.taskName,
        status: task.status
      });
    }
  });

  console.log('Found ' + updates.length + ' ACORD 130 tasks to update\n');

  // Update each task
  for (const task of updates) {
    console.log('Updating: ' + task.id + ' (' + task.taskName + ')');

    const { doc } = require('firebase/firestore');
    const taskRef = doc(db, 'companyTasks', task.id);
    await updateDoc(taskRef, {
      systemPrompt: enhancedPrompt,
      updatedAt: new Date().toISOString()
    });

    console.log('  ✅ Updated');
  }

  console.log('\n=== SUMMARY ===');
  console.log('Updated ' + updates.length + ' ACORD 130 tasks');
  console.log('All tasks now use the enhanced markdown format');
}

updateAllAcord130Tasks()
  .then(() => process.exit(0))
  .catch(console.error);
