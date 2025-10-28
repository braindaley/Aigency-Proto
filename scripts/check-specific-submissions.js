const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function checkSpecificTask() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking task and submissions...\n');

  // Get the task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskSnap = await getDoc(taskRef);

  if (taskSnap.exists()) {
    const taskData = taskSnap.data();
    console.log('📋 Task:', taskData.taskName);
    console.log('   Status:', taskData.status);
    console.log('   Interface Type:', taskData.interfaceType);
    console.log('');
  }

  // Get submissions
  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} submissions:\n`);

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`📧 Submission: ${doc.id}`);
    console.log(`   Carrier: ${data.carrierName}`);
    console.log(`   To: ${data.carrierEmail}`);
    console.log(`   Subject: ${data.subject}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Body preview: ${data.body?.substring(0, 150)}...`);
    console.log('');
  });
}

checkSpecificTask().catch(console.error);
