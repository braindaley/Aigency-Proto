/**
 * Check a specific task's chat messages
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

const taskId = 'v9gct3rb9OK9Ge46dyds';

async function checkTask() {
  console.log('=== CHECKING TASK CHAT ===\n');

  // Get task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('Task not found!');
    return;
  }

  const task = taskDoc.data();

  console.log('Task Details:');
  console.log('  ID:', taskId);
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Tag:', task.tag);
  console.log('  Phase:', task.phase);

  // Check chat messages
  console.log('\nChat Messages:');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
  const chatSnapshot = await getDocs(chatQuery);

  console.log(`  Total messages: ${chatSnapshot.docs.length}\n`);

  chatSnapshot.docs.forEach((msgDoc, index) => {
    const msg = msgDoc.data();
    const timestamp = msg.timestamp?.toDate?.() || 'Unknown time';

    console.log(`  Message ${index + 1}:`);
    console.log(`    ID: ${msgDoc.id}`);
    console.log(`    Timestamp: ${timestamp}`);
    console.log(`    Role: ${msg.role}`);
    console.log(`    Is Validation: ${msg.isValidation || false}`);
    console.log(`    Is AI Generated: ${msg.isAIGenerated || false}`);
    console.log(`    Content length: ${msg.content?.length || 0}`);

    // Check for issues
    const issues = [];
    if (msg.content?.includes('<artifact>')) {
      issues.push('Contains <artifact> tags');
    }
    if (msg.content?.includes('```json')) {
      issues.push('Contains JSON code block');
    }
    if (msg.content?.match(/\{\s*"/)) {
      issues.push('Contains JSON object');
    }

    if (issues.length > 0) {
      console.log(`    ⚠️ ISSUES: ${issues.join(', ')}`);
    } else {
      console.log(`    ✅ No issues detected`);
    }

    // Show content preview
    const preview = msg.content?.substring(0, 200) || '';
    console.log(`    Content preview: ${preview}...`);
    console.log('');
  });

  // Check if cleanup is needed
  const messagesWithIssues = chatSnapshot.docs.filter(msgDoc => {
    const msg = msgDoc.data();
    return msg.content?.includes('<artifact>') ||
           msg.content?.includes('```json') ||
           msg.content?.match(/\{\s*"/);
  });

  if (messagesWithIssues.length > 0) {
    console.log(`\n⚠️ ${messagesWithIssues.length} message(s) need cleanup`);
    console.log('Run: node scripts/clean-specific-task.js ' + taskId);
  } else {
    console.log('\n✅ All messages are clean');
  }
}

checkTask()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
