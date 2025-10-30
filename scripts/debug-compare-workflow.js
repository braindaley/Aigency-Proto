const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function debugCompareWorkflow() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('🔍 Debugging compare policy workflow...\n');

  // Find workflow for this company
  const workflowsRef = collection(db, 'comparePolicyWorkflows');
  const workflowQuery = query(
    workflowsRef,
    where('companyId', '==', companyId)
  );

  const workflowSnapshot = await getDocs(workflowQuery);

  if (workflowSnapshot.empty) {
    console.log('❌ No workflow found for this company');
    return;
  }

  const workflowDoc = workflowSnapshot.docs[0];
  const workflow = { id: workflowDoc.id, ...workflowDoc.data() };

  console.log('📋 Workflow State:');
  console.log('  ID:', workflow.id);
  console.log('  Phase:', workflow.phase);
  console.log('  Status:', workflow.status);
  console.log('  Uploaded Documents:', JSON.stringify(workflow.uploadedDocuments, null, 2));
  console.log('\n');

  // Check uploaded documents
  const uploadedDocs = workflow.uploadedDocuments || {};
  console.log('📄 Document Details:');
  console.log('  Has proposal:', !!uploadedDocs.proposal);
  console.log('  Has issued policy:', !!uploadedDocs.issuedPolicy);
  console.log('  Proposal ID:', uploadedDocs.proposal || 'MISSING');
  console.log('  Issued Policy ID:', uploadedDocs.issuedPolicy || 'MISSING');
  console.log('\n');

  // Check chat history
  console.log('💬 Chat History:');
  if (workflow.chatHistory && workflow.chatHistory.length > 0) {
    workflow.chatHistory.forEach((msg, idx) => {
      const preview = msg.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${idx + 1}. [${msg.role}] ${preview}...`);
    });
  } else {
    console.log('  No messages');
  }
}

debugCompareWorkflow()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
