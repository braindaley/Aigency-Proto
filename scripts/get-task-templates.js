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

async function getTaskTemplates() {
  const template1Id = 'vNx8Pm2QkR5tLwY9ZaBc';
  const template2Id = 'xSlP5LJa24ZxHpX8q4pi';

  console.log('=== SEARCHING FOR TASK TEMPLATES IN TASKS COLLECTION ===\n');

  const tasksCollection = collection(db, 'tasks');
  const q = query(tasksCollection, where('policyType', '==', 'workers-comp'));
  const tasksSnapshot = await getDocs(q);

  let sendFollowupTask = null;
  let sendSubmissionTask = null;

  tasksSnapshot.forEach(doc => {
    if (doc.id === template1Id) {
      sendFollowupTask = { id: doc.id, ...doc.data() };
    }
    if (doc.id === template2Id) {
      sendSubmissionTask = { id: doc.id, ...doc.data() };
    }
  });

  if (sendFollowupTask) {
    console.log('=== SEND FOLLOW-UP EMAILS TASK (NOT WORKING) ===');
    console.log('ID:', sendFollowupTask.id);
    console.log('Name:', sendFollowupTask.taskName);
    console.log('Phase:', sendFollowupTask.phase);
    console.log('Tag:', sendFollowupTask.tag);
    console.log('Sort Order:', sendFollowupTask.sortOrder);
    console.log('Dependencies:', JSON.stringify(sendFollowupTask.dependencies));
    console.log('System Prompt Length:', sendFollowupTask.systemPrompt?.length || 0);
    console.log('Interface Type:', sendFollowupTask.interfaceType);
    console.log('\nSystem Prompt:');
    console.log(sendFollowupTask.systemPrompt || 'NONE');
  } else {
    console.log('❌ Send follow-up emails task not found');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  if (sendSubmissionTask) {
    console.log('=== SEND SUBMISSION PACKETS TASK (WORKING) ===');
    console.log('ID:', sendSubmissionTask.id);
    console.log('Name:', sendSubmissionTask.taskName);
    console.log('Phase:', sendSubmissionTask.phase);
    console.log('Tag:', sendSubmissionTask.tag);
    console.log('Sort Order:', sendSubmissionTask.sortOrder);
    console.log('Dependencies:', JSON.stringify(sendSubmissionTask.dependencies));
    console.log('System Prompt Length:', sendSubmissionTask.systemPrompt?.length || 0);
    console.log('Interface Type:', sendSubmissionTask.interfaceType);
    console.log('\nSystem Prompt:');
    console.log(sendSubmissionTask.systemPrompt || 'NONE');
  } else {
    console.log('❌ Send submission packets task not found');
  }

  process.exit(0);
}

getTaskTemplates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
