const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAcz7kZJH4Jb8TEnzBIgQI3r5gxEZP_dKI",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1066649353387",
  appId: "1:1066649353387:web:3a8e71d32f3c33b3b82b23"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function triggerNextTask() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const taskId = '79VTLVr7GgZOVuq1LFng'; // Task 5: Complete ACORD 130

  console.log('🔧 Triggering Task 5 (ACORD 130)...\n');

  // Update task status to Needs attention
  const taskRef = doc(db, 'companyTasks', taskId);
  await updateDoc(taskRef, {
    status: 'Needs attention',
    updatedAt: Timestamp.now(),
  });

  console.log('✅ Updated task status to "Needs attention"');

  // Trigger the API
  const response = await fetch('http://localhost:9003/api/ai-task-completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId,
      companyId,
      workflowId: 'SocSNbV3cXnU5QP1h8sz',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ API Error:', error);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('✅ API Response:', result);
}

triggerNextTask()
  .then(() => {
    console.log('\n✅ Task triggered successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
