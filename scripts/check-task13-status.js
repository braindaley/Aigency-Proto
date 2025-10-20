const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAPbristGE8ytc59RD-KL0JMJL-EuVW23R8",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "326368003305",
  appId: "1:326368003305:web:0c95f9e94ed99f4ac27bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTask13Status() {
  const taskId = 'B10M67bZTVuuI5TFDjRz'; // Task 13

  console.log('\nChecking Task 13 status...');

  // Get task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('Task not found!');
    process.exit(1);
  }

  const task = taskDoc.data();
  console.log('\nTask Details:');
  console.log(`  Name: ${task.taskName}`);
  console.log(`  Status: ${task.status}`);
  console.log(`  Tag: ${task.tag}`);
  console.log(`  Completed By: ${task.completedBy || 'none'}`);
  console.log(`  Sort Order: ${task.sortOrder}`);
  console.log(`  Dependencies: ${task.dependencies?.join(', ') || 'none'}`);

  // Check chat messages
  console.log('\nChecking chat messages...');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
  const chatSnapshot = await getDocs(chatQuery);

  console.log(`Found ${chatSnapshot.size} chat messages:`);
  chatSnapshot.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`\n  Message ${idx + 1}:`);
    console.log(`    Role: ${data.role}`);
    console.log(`    Timestamp: ${data.timestamp?.toDate?.()}`);
    console.log(`    Has Artifact: ${data.hasArtifact || false}`);
    console.log(`    Content length: ${(data.content || '').length} characters`);
    console.log(`    Content preview: ${(data.content || '').substring(0, 200)}...`);
  });

  process.exit(0);
}

checkTask13Status().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
