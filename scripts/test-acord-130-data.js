/**
 * Test script to check what data is available for the ACORD 130 task
 */

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

const companyId = 'qsu1QXPB8TUK2P4QyDiy';
const taskId = 'ubzOt0QWVFXxSYXEZOzM';

async function checkData() {
  console.log('=== CHECKING ACORD 130 TASK DATA ===\n');

  // Check task details
  console.log('1. Task Details:');
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);
  if (taskDoc.exists()) {
    const task = taskDoc.data();
    console.log('  - Task Name:', task.taskName);
    console.log('  - Description:', task.description?.substring(0, 100) + '...');
    console.log('  - Tag:', task.tag);
    console.log('  - Status:', task.status);
    console.log('  - Has systemPrompt:', !!task.systemPrompt);
    console.log('  - Has testCriteria:', !!task.testCriteria);
  } else {
    console.log('  - Task not found!');
  }

  // Check company details
  console.log('\n2. Company Details:');
  const companyRef = doc(db, 'companies', companyId);
  const companyDoc = await getDoc(companyRef);
  if (companyDoc.exists()) {
    const company = companyDoc.data();
    console.log('  - Company Name:', company.name);
    console.log('  - Renewal Date:', company.renewalDate?.toDate());
    console.log('  - Available fields:', Object.keys(company).join(', '));
  }

  // Check documents collection
  console.log('\n3. Documents Collection:');
  const docsRef = collection(db, `companies/${companyId}/documents`);
  const docsSnapshot = await getDocs(docsRef);
  console.log(`  - Total documents: ${docsSnapshot.docs.length}`);

  docsSnapshot.docs.forEach((docSnapshot, index) => {
    const docData = docSnapshot.data();
    console.log(`\n  Document ${index + 1}:`);
    console.log('    - Name:', docData.name);
    console.log('    - Type:', docData.type);
    console.log('    - Size:', docData.size);
    console.log('    - Has extractedText:', !!docData.extractedText);
    console.log('    - Extracted text length:', docData.extractedText?.length || 0);
    console.log('    - Processing status:', docData.processingStatus);

    // Check if this is a prior year ACORD 130
    if (docData.name?.includes('ACORD') || docData.name?.includes('24-25') || docData.name?.includes('WC')) {
      console.log('    >>> POTENTIAL PRIOR YEAR ACORD 130 FOUND! <<<');
      if (docData.extractedText) {
        console.log('    - Preview:', docData.extractedText.substring(0, 200));
      }
    }
  });

  // Check artifacts collection
  console.log('\n4. Artifacts Collection:');
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsSnapshot = await getDocs(artifactsRef);
  console.log(`  - Total artifacts: ${artifactsSnapshot.docs.length}`);

  artifactsSnapshot.docs.forEach((artifactSnapshot, index) => {
    const artifactData = artifactSnapshot.data();
    console.log(`\n  Artifact ${index + 1}:`);
    console.log('    - Name:', artifactData.name);
    console.log('    - Type:', artifactData.type);
    console.log('    - Has data:', !!artifactData.data);
    console.log('    - Data length:', artifactData.data?.length || 0);
    console.log('    - Tags:', artifactData.tags);

    // Check if this contains ACORD data
    if (artifactData.name?.includes('ACORD') || artifactData.name?.includes('130')) {
      console.log('    >>> POTENTIAL ACORD 130 ARTIFACT FOUND! <<<');
      if (artifactData.data) {
        console.log('    - Preview:', String(artifactData.data).substring(0, 200));
      }
    }
  });

  // Check task chat messages
  console.log('\n5. Task Chat Messages:');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnapshot = await getDocs(chatRef);
  console.log(`  - Total messages: ${chatSnapshot.docs.length}`);

  chatSnapshot.docs.forEach((msgSnapshot, index) => {
    const msgData = msgSnapshot.data();
    console.log(`\n  Message ${index + 1}:`);
    console.log('    - Role:', msgData.role);
    console.log('    - Is AI Generated:', msgData.isAIGenerated);
    console.log('    - Is Validation:', msgData.isValidation);
    console.log('    - Content length:', msgData.content?.length || 0);
    console.log('    - Content preview:', msgData.content?.substring(0, 150));

    if (msgData.content?.includes('FAIL')) {
      console.log('    >>> VALIDATION FAILURE MESSAGE! <<<');
    }
  });
}

checkData()
  .then(() => {
    console.log('\n=== DATA CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
