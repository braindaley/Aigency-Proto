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

async function getTaskTestCriteria() {
  const templateId = 'XajTm0iTsvZX4RIXGmD6'; // Draft follow-up emails template

  console.log('=== TASK TEMPLATE TEST CRITERIA ===\n');

  const templateRef = doc(db, 'tasks', templateId);
  const templateSnap = await getDoc(templateRef);

  if (!templateSnap.exists()) {
    console.log('❌ Template not found');
    return;
  }

  const templateData = templateSnap.data();
  console.log('📋 Task:', templateData.taskName);
  console.log('   Template ID:', templateId);
  console.log('   Phase:', templateData.phase);
  console.log('   Sort Order:', templateData.sortOrder);
  console.log('');

  console.log('=== CURRENT TEST CRITERIA ===\n');
  if (templateData.testCriteria && Array.isArray(templateData.testCriteria)) {
    templateData.testCriteria.forEach((criteria, index) => {
      console.log(`${index + 1}. ${criteria}`);
    });
  } else {
    console.log('No test criteria found');
  }

  console.log('\n=== SYSTEM PROMPT ===\n');
  console.log(templateData.systemPrompt || 'No system prompt found');
}

getTaskTestCriteria().catch(console.error);
