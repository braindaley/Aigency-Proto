const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function fixAllTasks() {
  console.log('Fixing task dependencies and statuses...\n');

  // Task 1: Draft custom marketing emails (sortOrder 11)
  // Should depend on: ijkbooN3Mg8bFv1sE4wT (carrier search task)
  const marketingEmailsTaskId = 'jNhpC2VMnQwQPQYJgSeX';
  const carrierSearchTaskId = 'ijkbooN3Mg8bFv1sE4wT';

  console.log('1️⃣ Fixing "Draft custom marketing emails"...');
  await updateDoc(doc(db, 'companyTasks', marketingEmailsTaskId), {
    dependencies: [carrierSearchTaskId]
  });
  console.log('   ✅ Updated dependency to correct carrier search task');

  // Task 2: Send submission packets (sortOrder 12)
  // Should depend on: jNhpC2VMnQwQPQYJgSeX (marketing emails task)
  const sendSubmissionTaskId = 'RARYeXVoPmu7Vu8YI9Ba';

  console.log('\n2️⃣ Fixing "Send submission packets"...');
  await updateDoc(doc(db, 'companyTasks', sendSubmissionTaskId), {
    dependencies: [marketingEmailsTaskId]
  });
  console.log('   ✅ Updated dependency to marketing emails task');

  // Task 3: Draft follow-up emails (sortOrder 13)
  // Should depend on: RARYeXVoPmu7Vu8YI9Ba (send submission packets)
  // AND reset to available so it can be re-run with fixed artifact extraction
  const followUpEmailsTaskId = 'GwnjdfTi1JOPGBcpPWot';

  console.log('\n3️⃣ Fixing "Draft follow-up emails"...');
  await updateDoc(doc(db, 'companyTasks', followUpEmailsTaskId), {
    dependencies: [sendSubmissionTaskId],
    status: 'available',
    completedBy: null,
    completedDate: null
  });
  console.log('   ✅ Updated dependency and reset status to available');

  console.log('\n✅ All tasks fixed!');
  console.log('\n📝 Next steps:');
  console.log('  1. Marketing emails task - already has 5 submissions created');
  console.log('  2. Send submission packets - needs to create submissions from marketing emails');
  console.log('  3. Follow-up emails - can be re-run once other tasks are ready');
}

fixAllTasks().catch(console.error);
