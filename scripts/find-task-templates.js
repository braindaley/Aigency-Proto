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

async function findTaskSettings() {
  const template1Id = 'vNx8Pm2QkR5tLwY9ZaBc';
  const template2Id = 'xSlP5LJa24ZxHpX8q4pi';

  console.log('=== SEARCHING FOR TASK TEMPLATES ===\n');

  // Check taskSettings collection
  console.log('Checking taskSettings collection for workers-comp...');
  const taskSettingsSnap = await getDocs(collection(db, 'taskSettings'));

  let sendFollowupTask = null;
  let sendSubmissionTask = null;

  taskSettingsSnap.forEach(doc => {
    const data = doc.data();
    if (data.renewalType === 'workers-comp') {
      const tasks = data.tasks || [];
      tasks.forEach((task, idx) => {
        if (task.id === template1Id) {
          sendFollowupTask = { ...task, index: idx };
          console.log('\nFound "Send follow-up emails" task at index', idx);
          console.log('Task name:', task.name);
          console.log('Has systemPrompt:', task.systemPrompt ? 'yes' : 'no');
          console.log('System prompt length:', task.systemPrompt?.length || 0);
        }
        if (task.id === template2Id) {
          sendSubmissionTask = { ...task, index: idx };
          console.log('\nFound "Send submission packets" task at index', idx);
          console.log('Task name:', task.name);
          console.log('Has systemPrompt:', task.systemPrompt ? 'yes' : 'no');
          console.log('System prompt length:', task.systemPrompt?.length || 0);
        }
      });
    }
  });

  if (sendFollowupTask && sendSubmissionTask) {
    console.log('\n=== COMPARISON ===\n');
    console.log('Send follow-up emails (NOT WORKING):');
    console.log('  Name:', sendFollowupTask.name);
    console.log('  Tag:', sendFollowupTask.tag);
    console.log('  Phase:', sendFollowupTask.phase);
    console.log('  System Prompt (first 500 chars):');
    console.log('  ', sendFollowupTask.systemPrompt?.substring(0, 500) || 'NONE');

    console.log('\nSend submission packets (WORKING):');
    console.log('  Name:', sendSubmissionTask.name);
    console.log('  Tag:', sendSubmissionTask.tag);
    console.log('  Phase:', sendSubmissionTask.phase);
    console.log('  System Prompt (first 500 chars):');
    console.log('  ', sendSubmissionTask.systemPrompt?.substring(0, 500) || 'NONE');
  }

  process.exit(0);
}

findTaskSettings().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
