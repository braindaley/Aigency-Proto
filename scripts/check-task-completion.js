const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

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

async function checkTaskCompletion() {
  const taskId = 'IuFlbSqoJsRw1HuQMhTA';
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CHECKING TASK COMPLETION ===\n');
  
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('Task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('Task:', task.taskName);
  console.log('Status:', task.status);
  console.log('Completed At:', task.completedAt);
  console.log('Completed By:', task.completedBy);
  console.log('');
  
  // Check for artifacts created by this task
  console.log('=== CHECKING FOR ARTIFACTS ===\n');
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsSnap = await getDocs(artifactsRef);
  
  const taskArtifacts = artifactsSnap.docs.filter(doc => {
    const data = doc.data();
    return data.taskId === taskId;
  });
  
  if (taskArtifacts.length > 0) {
    console.log(`Found ${taskArtifacts.length} artifact(s):\n`);
    taskArtifacts.forEach((artifact, i) => {
      const data = artifact.data();
      console.log(`${i + 1}. ${data.name}`);
      console.log('   Size:', data.data ? data.data.length + ' chars' : '0 chars');
      console.log('   Type:', data.type);
      if (data.data) {
        console.log('   Preview:', data.data.substring(0, 200).trim() + '...');
      }
      console.log('');
    });
  } else {
    console.log('No artifacts found for this task.');
  }
  
  // Check chat messages
  console.log('=== CHECKING CHAT MESSAGES ===\n');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnap = await getDocs(chatRef);
  
  console.log('Total messages:', chatSnap.size);
  
  if (chatSnap.size > 0) {
    const messages = [];
    chatSnap.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    messages.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return aTime - bTime;
    });
    
    console.log('\nLast 3 messages:\n');
    messages.slice(-3).forEach((msg, i) => {
      console.log(`${i + 1}. [${msg.role}]`);
      const content = msg.content || 'No content';
      console.log(content.substring(0, 300));
      console.log('');
    });
  }
}

checkTaskCompletion()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
