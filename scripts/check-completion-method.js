/**
 * Check how the ACORD 130 task was completed to understand why dependencies weren't triggered
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

const taskId = 'ubzOt0QWVFXxSYXEZOzM'; // ACORD 130 task

async function checkCompletionMethod() {
  console.log('=== CHECKING ACORD 130 COMPLETION METHOD ===\n');

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
  console.log('  Completed By:', task.completedBy || 'Not specified');
  console.log('  Updated At:', task.updatedAt);

  // Check chat messages to see how it was completed
  console.log('\nChat History:');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
  const chatSnapshot = await getDocs(chatQuery);

  console.log(`  Total messages: ${chatSnapshot.docs.length}\n`);

  chatSnapshot.docs.forEach((msgDoc, index) => {
    const msg = msgDoc.data();
    const timestamp = msg.timestamp?.toDate?.() || 'Unknown time';

    console.log(`  Message ${index + 1}:`);
    console.log(`    Role: ${msg.role}`);
    console.log(`    Timestamp: ${timestamp}`);
    console.log(`    Is AI Generated: ${msg.isAIGenerated || false}`);
    console.log(`    Is Validation: ${msg.isValidation || false}`);
    console.log(`    Is Completion Summary: ${msg.isCompletionSummary || false}`);
    console.log(`    Content preview: ${msg.content?.substring(0, 100)}...`);
    console.log('');
  });

  // Check artifacts to see the final output
  console.log('Artifacts:');
  const artifactsRef = collection(db, `companies/${task.companyId}/artifacts`);
  const artifactsSnapshot = await getDocs(artifactsRef);

  const acord130Artifacts = artifactsSnapshot.docs.filter(doc => {
    const data = doc.data();
    return data.name?.includes('ACORD 130');
  });

  console.log(`  Found ${acord130Artifacts.length} ACORD 130 artifacts\n`);

  acord130Artifacts.forEach((artifactDoc, index) => {
    const artifact = artifactDoc.data();
    console.log(`  Artifact ${index + 1}:`);
    console.log(`    Name: ${artifact.name}`);
    console.log(`    Type: ${artifact.type}`);
    console.log(`    Created At: ${artifact.createdAt?.toDate?.() || 'Unknown'}`);
    console.log(`    Updated At: ${artifact.updatedAt?.toDate?.() || 'Unknown'}`);
    console.log(`    Tags: ${artifact.tags}`);
    console.log('');
  });

  // Key question: Was the task completed via:
  // 1. AI task completion endpoint (should trigger dependencies)
  // 2. Manual status update (might not trigger dependencies)
  // 3. Script (our fix script)

  console.log('\n=== ANALYSIS ===');

  const wasCompletedByAI = task.completedBy === 'AI System';
  const wasCompletedManually = !task.completedBy || task.completedBy === 'user';
  const wasCompletedByScript = task.completedBy && task.completedBy.includes('script');

  console.log('Completion Method:');
  if (wasCompletedByAI) {
    console.log('  ✅ Completed by AI System');
    console.log('  Expected behavior: Dependencies should have been triggered automatically');
    console.log('  Actual: Dependencies were NOT triggered (bug in AI completion endpoint)');
  } else if (wasCompletedByScript) {
    console.log('  🔧 Completed by script');
    console.log('  Expected behavior: Depends on script implementation');
  } else {
    console.log('  👤 Completed manually or by unknown method');
    console.log('  Expected behavior: Dependencies might not be triggered automatically');
  }

  console.log('\nRecommendation:');
  console.log('  The update-task-status API should always be called when marking tasks complete');
  console.log('  This ensures dependent tasks are properly updated');
}

checkCompletionMethod()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
