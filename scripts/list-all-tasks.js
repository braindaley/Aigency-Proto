const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB3XlnTBdVIZe8h32wU9OtXvkDv0c-F1t8",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1076469562302",
  appId: "1:1076469562302:web:09a7fb81a51a1d0c3c0c11"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listAllTasks() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';

  const tasksRef = collection(db, `companies/${companyId}/tasks`);
  const tasksSnapshot = await getDocs(tasksRef);

  console.log(`Found ${tasksSnapshot.docs.length} tasks total\n`);

  // Find the send submission packets task
  const targetTask = tasksSnapshot.docs.find(doc => {
    const data = doc.data();
    return data.taskName?.toLowerCase().includes('submission') ||
           data.taskName?.toLowerCase().includes('packets') ||
           doc.id === 'IuFlbSqoJsRw1HuQMhTA';
  });

  if (targetTask) {
    const data = targetTask.data();
    console.log('=== Found "Send Submission Packets" Task ===\n');
    console.log('Task ID:', targetTask.id);
    console.log('Task Name:', data.taskName);
    console.log('Status:', data.status);
    console.log('Completed At:', data.completedAt?.toDate?.() || 'Not completed');
    console.log('Updated At:', data.updatedAt);
    console.log('\nSystem Prompt (first 800 chars):');
    console.log((data.systemPrompt || '').substring(0, 800));
    console.log('\n...\n');
  } else {
    console.log('Could not find the "Send Submission Packets" task');
    console.log('\nAll task names:');
    tasksSnapshot.docs.forEach(doc => {
      console.log('-', doc.id, ':', doc.data().taskName);
    });
  }

  process.exit(0);
}

listAllTasks().catch(console.error);
