const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function debugWorkflow() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const renewalType = 'workers-comp';

  console.log('🔍 Debugging build package workflow...\n');

  // Find workflow for this company and renewal type
  const workflowsRef = collection(db, 'buildPackageWorkflows');
  const workflowQuery = query(
    workflowsRef,
    where('companyId', '==', companyId),
    where('renewalType', '==', renewalType)
  );

  const workflowSnapshot = await getDocs(workflowQuery);

  if (workflowSnapshot.empty) {
    console.log('❌ No workflow found for this company and renewal type');
    return;
  }

  const workflowDoc = workflowSnapshot.docs[0];
  const workflow = { id: workflowDoc.id, ...workflowDoc.data() };

  console.log('📋 Workflow State:');
  console.log('  ID:', workflow.id);
  console.log('  Phase:', workflow.phase);
  console.log('  Status:', workflow.status);
  console.log('  Task IDs:', workflow.taskIds);
  console.log('  Uploaded Documents:', workflow.uploadedDocuments);
  console.log('\n');

  // Check each task
  if (workflow.taskIds && workflow.taskIds.length > 0) {
    console.log('📝 Task Details:');
    for (let i = 0; i < workflow.taskIds.length; i++) {
      const taskId = workflow.taskIds[i];
      if (!taskId) {
        console.log(`  Task ${i + 1}: [NULL/EMPTY]`);
        continue;
      }

      const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
      if (!taskDoc.exists()) {
        console.log(`  Task ${i + 1}: [NOT FOUND] ${taskId}`);
        continue;
      }

      const task = taskDoc.data();
      console.log(`  Task ${i + 1} (${taskId}):`);
      console.log(`    Name: ${task.taskName}`);
      console.log(`    Status: ${task.status}`);
      console.log(`    Tag: ${task.tag}`);
      console.log(`    Has testCriteria: ${!!task.testCriteria}`);

      // Check for artifacts
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
      const artifactsSnapshot = await getDocs(artifactsQuery);

      if (!artifactsSnapshot.empty) {
        console.log(`    Artifacts: ${artifactsSnapshot.size}`);
        artifactsSnapshot.docs.forEach((artifactDoc, idx) => {
          const artifact = artifactDoc.data();
          console.log(`      - ${idx + 1}. ${artifact.name} (${artifact.data?.length || 0} chars)`);
        });
      } else {
        console.log(`    Artifacts: NONE`);
      }
      console.log('');
    }
  }

  // Check chat history
  console.log('\n💬 Chat History:');
  if (workflow.chatHistory && workflow.chatHistory.length > 0) {
    workflow.chatHistory.forEach((msg, idx) => {
      const preview = msg.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${idx + 1}. [${msg.role}] ${preview}...`);
    });
  } else {
    console.log('  No messages');
  }
}

debugWorkflow()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
