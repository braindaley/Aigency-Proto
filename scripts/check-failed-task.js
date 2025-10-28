const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } = require('firebase/firestore');

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

async function checkFailedTask() {
  const taskId = 'GwnjdfTi1JOPGBcpPWot';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Investigating failed task...\n');

  // Get task details
  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  if (!taskDoc.exists()) {
    console.log('❌ Task not found');
    return;
  }

  const task = taskDoc.data();
  console.log('📋 Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Sort Order:', task.sortOrder);
  console.log('  Phase:', task.phase);
  console.log('  Tag:', task.tag);
  console.log('  Dependencies:', task.dependencies || 'none');
  console.log('  Completed By:', task.completedBy || 'not completed');

  // Check for artifacts
  console.log('\n📦 Checking Artifacts:');
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
  const artifactsSnapshot = await getDocs(artifactsQuery);

  console.log(`Found ${artifactsSnapshot.size} artifacts`);
  if (artifactsSnapshot.size > 0) {
    artifactsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n  Artifact: ${doc.id}`);
      console.log(`    Name: ${data.name}`);
      console.log(`    Type: ${data.type}`);
      console.log(`    Content length: ${(data.data || '').length} chars`);
    });
  }

  // Check chat messages
  console.log('\n💬 Chat Messages:');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnapshot = await getDocs(chatRef);

  console.log(`Found ${chatSnapshot.size} chat messages`);

  const messages = [];
  chatSnapshot.forEach(doc => {
    messages.push({ id: doc.id, ...doc.data() });
  });

  // Sort by timestamp
  messages.sort((a, b) => {
    const aTime = a.timestamp?.toMillis?.() || 0;
    const bTime = b.timestamp?.toMillis?.() || 0;
    return aTime - bTime;
  });

  messages.forEach((msg, idx) => {
    console.log(`\n  Message ${idx + 1}:`);
    console.log(`    Role: ${msg.role}`);
    console.log(`    Is AI Generated: ${msg.isAIGenerated || false}`);
    console.log(`    Has Artifact: ${msg.hasArtifact || false}`);
    console.log(`    Is Validation: ${msg.isValidation || false}`);
    console.log(`    Content preview: ${(msg.content || '').substring(0, 200)}...`);
  });

  // Check AI task job status
  console.log('\n🤖 AI Task Job Status:');
  const jobDoc = await getDoc(doc(db, 'aiTaskJobs', taskId));
  if (jobDoc.exists()) {
    const job = jobDoc.data();
    console.log('  Status:', job.status);
    console.log('  Progress:', job.progress || 'none');
    console.log('  Error:', job.error || 'none');
  } else {
    console.log('  No job record found');
  }

  // Check system prompt
  console.log('\n📝 System Prompt (first 500 chars):');
  console.log('---');
  console.log((task.systemPrompt || 'No system prompt').substring(0, 500));
  console.log('---');

  // Check test criteria
  console.log('\n🎯 Test Criteria:');
  console.log('---');
  console.log(task.testCriteria || 'No test criteria');
  console.log('---');
}

checkFailedTask().catch(console.error);
