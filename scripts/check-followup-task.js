const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkFollowUpTask() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const renewalType = 'workers-comp';

  console.log('=== CHECKING TASK TEMPLATES ===\n');

  // Get all task templates for workers-comp
  const templatesRef = collection(db, 'tasks');
  const templatesQuery = query(templatesRef, where('policyType', '==', renewalType));
  const templatesSnap = await getDocs(templatesQuery);

  console.log(`Found ${templatesSnap.size} task templates for ${renewalType}:\n`);

  templatesSnap.forEach(doc => {
    const data = doc.data();
    console.log(`📋 Template: ${data.taskName}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Phase: ${data.phase}`);
    console.log(`   Sort Order: ${data.sortOrder}`);
    console.log(`   Tag: ${data.tag}`);
    console.log(`   Dependencies: ${JSON.stringify(data.dependencies || [])}`);
    console.log('');
  });

  console.log('\n=== CHECKING COMPANY TASKS ===\n');

  // Get all company tasks for this company and renewal type
  const companyTasksRef = collection(db, 'companyTasks');
  const companyTasksQuery = query(
    companyTasksRef,
    where('companyId', '==', companyId),
    where('renewalType', '==', renewalType)
  );
  const companyTasksSnap = await getDocs(companyTasksQuery);

  console.log(`Found ${companyTasksSnap.size} company tasks for ${renewalType}:\n`);

  const tasks = [];
  companyTasksSnap.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      name: data.taskName,
      sortOrder: data.sortOrder || 0,
      status: data.status,
      phase: data.phase,
      tag: data.tag
    });
  });

  // Sort by sortOrder
  tasks.sort((a, b) => a.sortOrder - b.sortOrder);

  tasks.forEach(task => {
    console.log(`${task.sortOrder}. ${task.name}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Phase: ${task.phase}`);
    console.log(`   Tag: ${task.tag}`);
    console.log('');
  });

  // Check for follow-up related tasks
  console.log('\n=== FOLLOW-UP RELATED TASKS ===\n');
  const followUpTasks = tasks.filter(t =>
    t.name.toLowerCase().includes('follow') ||
    t.name.toLowerCase().includes('email')
  );

  if (followUpTasks.length === 0) {
    console.log('❌ NO FOLLOW-UP TASKS FOUND');
  } else {
    followUpTasks.forEach(task => {
      console.log(`✓ ${task.name} (${task.status})`);
    });
  }
}

checkFollowUpTask().catch(console.error);
