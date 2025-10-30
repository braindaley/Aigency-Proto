const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, Timestamp } = require('firebase/firestore');

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

async function moveToReview() {
  const workflowId = 'SocSNbV3cXnU5QP1h8sz';

  console.log('🔄 Moving workflow to review phase...\n');

  const workflowRef = doc(db, 'buildPackageWorkflows', workflowId);

  const reviewMessage = {
    role: 'assistant',
    content: "Your submission package is ready! Review the generated documents on the right side. You can download any document individually. When you're ready, we can proceed to the next steps.",
    timestamp: Timestamp.now(),
  };

  await updateDoc(workflowRef, {
    phase: 'review',
    status: 'in_progress',
    updatedAt: Timestamp.now(),
  });

  console.log('✅ Workflow moved to review phase');
}

moveToReview()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
