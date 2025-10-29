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

async function retriggerTask14() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const task13Id = 'GwnjdfTi1JOPGBcpPWot'; // Draft follow-up emails
  const task14Id = 'YilhpZgWUxGLloeTWw6c'; // Send follow-up emails

  console.log('=== CHECKING TASK 13 ARTIFACTS ===\n');

  // Check if Task 13 has artifacts with content
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q = query(artifactsRef, where('taskId', '==', task13Id));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} artifacts from Task 13\n`);

  let hasContent = false;
  let artifactCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const contentLength = data.content?.length || 0;
    console.log(`  - ${data.name || data.artifactId}: ${contentLength} chars`);
    if (contentLength > 0) {
      hasContent = true;
      artifactCount++;
    }
  });

  console.log(`\n${artifactCount} artifacts have content\n`);

  if (!hasContent) {
    console.log('❌ Task 13 artifacts are empty. You need to:');
    console.log('   1. Open Task 13: http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/tasks/GwnjdfTi1JOPGBcpPWot');
    console.log('   2. Trigger the AI to generate follow-up emails');
    console.log('   3. Wait for it to complete');
    console.log('   4. Run this script again\n');
    process.exit(1);
  }

  console.log('✅ Task 13 has content! Now triggering Task 14...\n');

  // Call the API to create submissions from artifacts
  const fetch = (await import('node-fetch')).default;

  const response = await fetch('http://localhost:9003/api/submissions/create-from-artifacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyId,
      taskId: task14Id,
      taskName: 'Send follow-up emails'
    })
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Successfully created submissions!');
    console.log(`   Created ${result.count} submissions`);
    console.log(`   Submission IDs: ${result.submissionIds?.join(', ')}`);
    console.log('\nNow open Task 14 to view and send the emails:');
    console.log('   http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/tasks/YilhpZgWUxGLloeTWw6c');
  } else {
    console.log('❌ Failed to create submissions:', result);
  }
}

retriggerTask14().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
