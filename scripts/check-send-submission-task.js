const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkSendSubmissionTask() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking "Send submission packets" task...\n');

  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }

  const task = taskDoc.data();
  console.log('📋 Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Sort Order:', task.sortOrder);
  console.log('  Dependencies:', task.dependencies);
  console.log('  Interface Type:', task.interfaceType || 'not set');

  console.log('\n📝 System Prompt Preview (first 1000 chars):');
  console.log('---');
  console.log((task.systemPrompt || 'No system prompt').substring(0, 1000));
  console.log('---');

  // Check submissions created for this task
  console.log('\n📧 Email Submissions:');
  const submissionsSnapshot = await getDocs(query(
    collection(db, `companies/${companyId}/submissions`),
    where('taskId', '==', taskId)
  ));

  console.log(`Found ${submissionsSnapshot.size} submissions for this task`);

  submissionsSnapshot.forEach(doc => {
    const sub = doc.data();
    console.log(`\n  Submission ${doc.id}:`);
    console.log(`    Carrier: ${sub.carrierName}`);
    console.log(`    Subject: ${sub.subject}`);
    console.log(`    Status: ${sub.status}`);
    console.log(`    Attachments: ${(sub.attachments || []).length}`);
    if (sub.attachments && sub.attachments.length > 0) {
      sub.attachments.forEach(att => {
        console.log(`      - ${att.name || att.fileName}`);
      });
    }
  });

  // Check dependency task
  if (task.dependencies && task.dependencies.length > 0) {
    console.log('\n📦 Dependency Task:');
    const depTaskId = task.dependencies[0];
    const depTaskDoc = await getDoc(doc(db, 'companyTasks', depTaskId));
    if (depTaskDoc.exists()) {
      const depTask = depTaskDoc.data();
      console.log(`  ${depTask.taskName} (${depTaskId})`);
      console.log(`  Status: ${depTask.status}`);

      const depArtifactsSnapshot = await getDocs(query(
        collection(db, `companies/${companyId}/artifacts`),
        where('taskId', '==', depTaskId)
      ));
      console.log(`  Artifacts: ${depArtifactsSnapshot.size}`);
    }
  }
}

checkSendSubmissionTask().catch(console.error);
