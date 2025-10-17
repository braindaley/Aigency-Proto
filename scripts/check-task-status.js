const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function checkTaskStatus() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const taskId = 'IuFlbSqoJsRw1HuQMhTA';

  const taskRef = doc(db, `companies/${companyId}/tasks`, taskId);
  const taskSnap = await getDoc(taskRef);

  if (taskSnap.exists()) {
    const data = taskSnap.data();
    console.log('=== Task Status ===\n');
    console.log('Task Name:', data.taskName);
    console.log('Status:', data.status);
    console.log('Completed At:', data.completedAt?.toDate?.() || 'Not completed');
    console.log('Completed By:', data.completedBy || 'N/A');
    console.log('Updated At:', data.updatedAt);
    console.log('\nSystem Prompt (first 500 chars):');
    console.log((data.systemPrompt || '').substring(0, 500) + '...');
  } else {
    console.log('Task not found');
  }

  process.exit(0);
}

checkTaskStatus().catch(console.error);
