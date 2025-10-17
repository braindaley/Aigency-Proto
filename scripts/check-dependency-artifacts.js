const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkDependencyArtifacts() {
  const depTaskId = 'KYHqncvTWOpG6Iys5maS';
  
  console.log('=== CHECKING DEPENDENCY TASK ARTIFACTS ===\n');
  console.log('Task ID:', depTaskId);
  console.log('Task: Finalize and approve submission package\n');
  
  // Check chat messages
  const chatRef = collection(db, 'taskChats', depTaskId, 'messages');
  const chatSnapshot = await getDocs(chatRef);
  console.log('Total chat messages:', chatSnapshot.size);
  
  // Look for artifacts in messages
  let artifactCount = 0;
  chatSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.content && data.content.includes('<artifact>')) {
      artifactCount++;
      const match = data.content.match(/<artifact>([\s\S]*?)<\/artifact>/);
      if (match) {
        console.log(`\nFound artifact in message:`);
        console.log('  Role:', data.role);
        console.log('  Artifact length:', match[1].length, 'characters');
        console.log('  First 300 chars:', match[1].substring(0, 300).trim());
      }
    }
  });
  
  if (artifactCount === 0) {
    console.log('\nNo artifacts found in chat messages.');
    console.log('\nLast few messages:');
    const messages = chatSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
    
    messages.slice(-3).forEach(msg => {
      console.log(`\n[${msg.role}]`);
      console.log(msg.content?.substring(0, 300) || 'No content');
    });
  }
}

checkDependencyArtifacts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
