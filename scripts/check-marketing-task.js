/**
 * Check marketing email task configuration
 */
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

async function checkMarketingTask() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking marketing email task...\n');

  // Get task
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
  console.log('  Dependencies:', task.dependencies || []);
  console.log('  Phase:', task.phase);
  console.log('  Tag:', task.tag);

  // Check if it matches submission creation criteria
  const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 ||
                           task.taskName?.toLowerCase().includes('send submission') ||
                           task.taskName?.toLowerCase().includes('send follow-up');
  console.log('\n🔍 Submission Creation Check:');
  console.log('  Matches criteria?', isSubmissionTask);
  console.log('  sortOrder === 12 or 14?', task.sortOrder === 12 || task.sortOrder === 14);
  console.log('  Name includes "send"?', task.taskName?.toLowerCase().includes('send'));

  // Check dependency artifacts
  if (task.dependencies && task.dependencies.length > 0) {
    console.log('\n📦 Checking Dependency Artifacts:');

    for (const depTaskId of task.dependencies) {
      console.log(`\n  Dependency: ${depTaskId}`);

      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const q = query(artifactsRef, where('taskId', '==', depTaskId));
      const snapshot = await getDocs(q);

      console.log(`  Found ${snapshot.size} artifacts`);

      let carrierCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        const hasCarrierName = !!data.carrierName;
        if (hasCarrierName) carrierCount++;

        console.log(`\n    Artifact: ${doc.id}`);
        console.log(`      Name: ${data.name}`);
        console.log(`      Has carrierName: ${hasCarrierName}`);
        console.log(`      carrierName value: ${data.carrierName || 'N/A'}`);
        console.log(`      Content length: ${(data.data || '').length} chars`);
      });

      console.log(`\n  ✅ ${carrierCount} artifacts have carrierName field`);
      console.log(`  ❌ ${snapshot.size - carrierCount} artifacts missing carrierName field`);
    }
  }

  // Check existing submissions
  console.log('\n📧 Existing Submissions:');
  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const submissionsQuery = query(submissionsRef, where('taskId', '==', taskId));
  const submissionsSnapshot = await getDocs(submissionsQuery);
  console.log(`  Found ${submissionsSnapshot.size} submissions for this task`);
}

checkMarketingTask().catch(console.error);
