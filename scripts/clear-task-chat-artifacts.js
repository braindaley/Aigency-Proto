const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, query, where } = require('firebase/firestore');

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

async function clearTaskData() {
  const taskId = 'u1UABltnXCqKIbhWCTVx';
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CLEARING TASK DATA FOR TESTING ===\n');
  console.log('Task ID: ' + taskId);
  console.log('Company ID: ' + companyId);
  console.log('');

  // Clear chat messages
  try {
    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    const chatSnapshot = await getDocs(chatRef);
    
    console.log('Found ' + chatSnapshot.size + ' chat messages to delete');
    
    for (const doc of chatSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log('✅ Chat messages cleared');
  } catch (error) {
    console.log('No chat messages found or error: ' + error.message);
  }

  // Clear artifacts
  try {
    const artifactsRef = collection(db, 'companies', companyId, 'artifacts');
    const q = query(artifactsRef, where('taskId', '==', taskId));
    const artifactsSnapshot = await getDocs(q);
    
    console.log('Found ' + artifactsSnapshot.size + ' artifacts to delete');
    
    for (const doc of artifactsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log('✅ Artifacts cleared');
  } catch (error) {
    console.log('No artifacts found or error: ' + error.message);
  }

  console.log('\n=== READY FOR TESTING ===');
  console.log('The task has been reset and is ready for testing.');
  console.log('Visit: http://localhost:9002/companies/' + companyId + '/tasks/' + taskId);
  console.log('\nExpected improvements:');
  console.log('1. ✅ AI will generate markdown format (not JSON)');
  console.log('2. ✅ Form will be COMPLETE with all fields filled');
  console.log('3. ✅ Missing data will use reasonable defaults');
  console.log('4. ✅ Form will be suitable for actual submission');
}

clearTaskData()
  .then(() => process.exit(0))
  .catch(console.error);
