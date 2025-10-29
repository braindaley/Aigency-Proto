const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function fixFollowUpTaskStatus() {
  const taskId = 'GwnjdfTi1JOPGBcpPWot';

  console.log('Updating task status from "available" to "Needs attention"...\n');

  try {
    const taskRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskRef, {
      status: 'Needs attention'
    });

    console.log('✅ Successfully updated task status to "Needs attention"');
    console.log('The "Draft follow-up emails" task should now appear on the page.');
  } catch (error) {
    console.error('❌ Error updating task:', error);
  }
}

fixFollowUpTaskStatus().catch(console.error);
