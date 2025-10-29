const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkSendFollowUpTask() {
  const taskId = 'YilhpZgWUxGLloeTWw6c'; // Send follow-up emails
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('=== CHECKING "SEND FOLLOW-UP EMAILS" TASK ===\n');

  // Get the task
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    console.log('❌ Task not found');
    return;
  }

  const taskData = taskSnap.data();
  console.log('📋 Task:', taskData.taskName);
  console.log('   Status:', taskData.status);
  console.log('   Template ID:', taskData.templateId);
  console.log('   Interface Type:', taskData.interfaceType);
  console.log('   Dependencies:', JSON.stringify(taskData.dependencies || []));
  console.log('');

  // Check for submissions created by this task
  console.log('=== CHECKING SUBMISSIONS ===\n');

  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const submissionsQuery = query(submissionsRef, where('taskId', '==', taskId));
  const submissionsSnap = await getDocs(submissionsQuery);

  console.log(`Found ${submissionsSnap.size} submission(s) for this task\n`);

  if (submissionsSnap.size > 0) {
    submissionsSnap.forEach((doc, index) => {
      const data = doc.data();
      console.log(`📧 Submission ${index + 1}:`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Carrier: ${data.carrierName}`);
      console.log(`   To: ${data.carrierEmail}`);
      console.log(`   Subject: ${data.subject}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
      console.log('');
    });
  }

  // Check the dependency task (Draft follow-up emails)
  console.log('=== CHECKING DEPENDENCY (Draft follow-up emails) ===\n');

  const draftTaskId = 'GwnjdfTi1JOPGBcpPWot';
  const draftTaskRef = doc(db, 'companyTasks', draftTaskId);
  const draftTaskSnap = await getDoc(draftTaskRef);

  if (draftTaskSnap.exists()) {
    const draftTask = draftTaskSnap.data();
    console.log('📋 Draft Task:', draftTask.taskName);
    console.log('   Status:', draftTask.status);
    console.log('');

    // Check for artifacts from the draft task
    console.log('=== CHECKING DRAFT ARTIFACTS ===\n');

    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQuery = query(artifactsRef, where('taskId', '==', draftTaskId));
    const artifactsSnap = await getDocs(artifactsQuery);

    console.log(`Found ${artifactsSnap.size} artifact(s) from Draft task\n`);

    if (artifactsSnap.size > 0) {
      artifactsSnap.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📄 Artifact ${index + 1}:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Title: ${data.title}`);
        console.log(`   Type: ${data.type}`);
        console.log(`   Content preview: ${data.content?.substring(0, 100)}...`);
        console.log('');
      });
    }
  }

  // Check the marketing emails task to see who was originally contacted
  console.log('=== CHECKING MARKETING EMAILS (Original Contacts) ===\n');

  const marketingTaskId = 'jNhpC2VMnQwQPQYJgSeX'; // Draft custom marketing emails
  const marketingArtifactsQuery = query(
    collection(db, `companies/${companyId}/artifacts`),
    where('taskId', '==', marketingTaskId)
  );
  const marketingArtifactsSnap = await getDocs(marketingArtifactsQuery);

  console.log(`Found ${marketingArtifactsSnap.size} artifact(s) from marketing task\n`);

  if (marketingArtifactsSnap.size > 0) {
    marketingArtifactsSnap.forEach((doc, index) => {
      const data = doc.data();
      console.log(`📧 Marketing Email ${index + 1}:`);
      console.log(`   Title: ${data.title}`);
      console.log('');
    });
  }

  // Check for actual sent emails (from Send submission packets task)
  console.log('=== CHECKING SENT SUBMISSION PACKETS ===\n');

  const sendPacketsTaskId = 'RARYeXVoPmu7Vu8YI9Ba';
  const packetsSubmissionsQuery = query(
    collection(db, `companies/${companyId}/submissions`),
    where('taskId', '==', sendPacketsTaskId)
  );
  const packetsSubmissionsSnap = await getDocs(packetsSubmissionsQuery);

  console.log(`Found ${packetsSubmissionsSnap.size} submission(s) from Send Packets task\n`);

  if (packetsSubmissionsSnap.size > 0) {
    console.log('These are the carriers that should receive follow-ups:\n');
    packetsSubmissionsSnap.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.carrierName} <${data.carrierEmail}>`);
    });
    console.log('');
  }

  console.log('=== ANALYSIS ===\n');
  console.log(`The "Send follow-up emails" task should:`);
  console.log(`1. Read the drafts from "Draft follow-up emails" task (${artifactsSnap?.size || 0} artifacts)`);
  console.log(`2. Match them to the carriers from "Send submission packets" task (${packetsSubmissionsSnap.size} carriers)`);
  console.log(`3. Create ${packetsSubmissionsSnap.size} submission records`);
  console.log(`\nActual submissions created: ${submissionsSnap.size}`);
  console.log(`\n${submissionsSnap.size === packetsSubmissionsSnap.size ? '✅' : '❌'} Match: Expected ${packetsSubmissionsSnap.size}, got ${submissionsSnap.size}`);
}

checkSendFollowUpTask().catch(console.error);
