/**
 * Get task template details
 */

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

const templateId = process.argv[2] || 'sKY8AVp6hj3pqZ957KTT';

async function getTemplate() {
  const templateRef = doc(db, 'tasks', templateId);
  const templateDoc = await getDoc(templateRef);

  if (!templateDoc.exists()) {
    console.log('Template not found in tasks collection!');
    return;
  }

  const template = templateDoc.data();

  console.log('=== TASK TEMPLATE ===');
  console.log('ID:', templateId);
  console.log('Name:', template.taskName);
  console.log('Description:', template.description);
  console.log('Tag:', template.tag);
  console.log('Phase:', template.phase);
  console.log('\n=== CURRENT SYSTEM PROMPT ===');
  console.log(template.systemPrompt || 'No system prompt');
  console.log('\n=== CURRENT TEST CRITERIA ===');
  console.log(template.testCriteria || 'No test criteria');
}

getTemplate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
