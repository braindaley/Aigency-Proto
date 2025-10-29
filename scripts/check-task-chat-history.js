const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs } = require('firebase/firestore');

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

async function checkTaskChatHistory() {
  const taskId = 'YilhpZgWUxGLloeTWw6c'; // Send follow-up emails

  console.log('=== TASK CHAT HISTORY ===\n');
  console.log(`Task ID: ${taskId}\n`);

  // Get chat messages
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
  const chatSnap = await getDocs(chatQuery);

  console.log(`Found ${chatSnap.size} message(s)\n`);

  if (chatSnap.size === 0) {
    console.log('No chat history found. Task may not have run.\n');
    return;
  }

  chatSnap.forEach((doc, index) => {
    const data = doc.data();
    console.log(`=== Message ${index + 1} ===`);
    console.log(`Role: ${data.role}`);
    console.log(`Timestamp: ${data.timestamp?.toDate?.() || 'N/A'}`);
    console.log(`Content:`);
    console.log(data.content);
    console.log('');
  });
}

checkTaskChatHistory().catch(console.error);
