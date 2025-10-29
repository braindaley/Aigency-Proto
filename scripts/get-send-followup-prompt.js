const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function getSendFollowUpPrompt() {
  const templateId = 'vNx8Pm2QkR5tLwY9ZaBc'; // Send follow-up emails template

  console.log('=== SEND FOLLOW-UP EMAILS TEMPLATE ===\n');

  const templateRef = doc(db, 'tasks', templateId);
  const templateSnap = await getDoc(templateRef);

  if (!templateSnap.exists()) {
    console.log('❌ Template not found');
    return;
  }

  const templateData = templateSnap.data();
  console.log('📋 Task:', templateData.taskName);
  console.log('   Template ID:', templateId);
  console.log('   Interface Type:', templateData.interfaceType);
  console.log('   Phase:', templateData.phase);
  console.log('');

  console.log('=== SYSTEM PROMPT ===\n');
  console.log(templateData.systemPrompt || 'No system prompt found');
  console.log('\n');

  console.log('=== INTERFACE TYPE ===');
  console.log(templateData.interfaceType || 'Not specified');
  console.log('');

  console.log('=== EXPECTED BEHAVIOR ===');
  console.log('This task should:');
  console.log('1. Look at the draft follow-up emails from the previous task');
  console.log('2. Create a submission record for each carrier');
  console.log('3. Each submission should have: carrierName, carrierEmail, subject, body');
  console.log('');
}

getSendFollowUpPrompt().catch(console.error);
