/**
 * Check the ACORD 125 task configuration and recent messages
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, orderBy } = require('firebase/firestore');

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

const taskId = '0DL0g4DjJXmCkT02hm3f'; // ACORD 125 task

async function checkAcord125() {
  console.log('=== CHECKING ACORD 125 TASK ===\n');

  // Get task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('Task not found!');
    return;
  }

  const task = taskDoc.data();

  console.log('Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Completed At:', task.completedAt);
  console.log('  Has systemPrompt:', !!task.systemPrompt);
  console.log('  Has testCriteria:', !!task.testCriteria);

  console.log('\nSystem Prompt Preview:');
  console.log('='.repeat(80));
  if (task.systemPrompt) {
    console.log(task.systemPrompt.substring(0, 500));
    console.log('...');
    console.log('\nOutput Format Check:');
    if (task.systemPrompt.includes('json') || task.systemPrompt.includes('JSON')) {
      console.log('  ⚠️ PROBLEM: System prompt mentions JSON format!');
      const jsonMatches = task.systemPrompt.match(/output.*format.*json|json.*format/gi);
      if (jsonMatches) {
        console.log('  Found:', jsonMatches);
      }
    } else {
      console.log('  ✅ No JSON format instruction found');
    }
  } else {
    console.log('NO SYSTEM PROMPT');
  }
  console.log('='.repeat(80));

  console.log('\nTest Criteria:');
  console.log('='.repeat(80));
  console.log(task.testCriteria || 'NO TEST CRITERIA');
  console.log('='.repeat(80));

  // Check recent chat messages
  console.log('\nRecent Chat Messages:');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatQuery = query(chatRef, orderBy('timestamp', 'desc'));
  const chatSnapshot = await getDocs(chatQuery);

  const recentMessages = chatSnapshot.docs.slice(0, 5);
  console.log(`  Showing ${recentMessages.length} most recent messages:\n`);

  recentMessages.forEach((msgDoc, index) => {
    const msg = msgDoc.data();
    const timestamp = msg.timestamp?.toDate?.() || 'Unknown time';

    console.log(`  Message ${index + 1}:`);
    console.log(`    Timestamp: ${timestamp}`);
    console.log(`    Role: ${msg.role}`);
    console.log(`    Is Validation: ${msg.isValidation || false}`);
    console.log(`    Content length: ${msg.content?.length || 0}`);
    console.log(`    Content preview: ${msg.content?.substring(0, 150)}...`);

    // Check for artifacts in content
    if (msg.content?.includes('<artifact>')) {
      console.log(`    ⚠️ STILL CONTAINS ARTIFACT TAGS!`);
    }
    if (msg.content?.includes('{') && msg.content?.includes('"applicant_information"')) {
      console.log(`    ⚠️ STILL CONTAINS JSON DATA!`);
    }
    console.log('');
  });

  // Check artifacts
  console.log('\nArtifacts for this task:');
  const artifactsRef = collection(db, `companies/${task.companyId}/artifacts`);
  const artifactsSnapshot = await getDocs(artifactsRef);

  const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
    const data = doc.data();
    return data.taskId === taskId || data.name?.includes('ACORD 125');
  });

  console.log(`  Found ${taskArtifacts.length} artifact(s)\n`);

  taskArtifacts.forEach((artifactDoc, index) => {
    const artifact = artifactDoc.data();
    console.log(`  Artifact ${index + 1}:`);
    console.log(`    ID: ${artifactDoc.id}`);
    console.log(`    Name: ${artifact.name}`);
    console.log(`    Type: ${artifact.type}`);
    console.log(`    Data length: ${artifact.data?.length || 0}`);
    console.log(`    Created: ${artifact.createdAt?.toDate?.() || 'Unknown'}`);
    console.log(`    Updated: ${artifact.updatedAt?.toDate?.() || 'Unknown'}`);

    // Check artifact format
    if (artifact.data) {
      const dataStr = String(artifact.data).trim();
      if (dataStr.startsWith('{') || dataStr.startsWith('[')) {
        console.log(`    ⚠️ Artifact is JSON format`);
      } else if (dataStr.startsWith('#')) {
        console.log(`    ✅ Artifact is Markdown format`);
      }
      console.log(`    Preview: ${dataStr.substring(0, 100)}...`);
    }
    console.log('');
  });
}

checkAcord125()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
