const { initializeApp } = require('firebase/app');
const { getFirestore, doc, onSnapshot, updateDoc, Timestamp } = require('firebase/firestore');

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

const workflowId = 'SocSNbV3cXnU5QP1h8sz';
const companyId = 'OHioSIzK4i7HwcjLbX5r';

let isProcessing = false;
let taskStatuses = {};

async function triggerTask(taskId, taskIndex) {
  if (isProcessing) {
    console.log(`⏸️  Already processing a task, will retry...`);
    return false;
  }

  isProcessing = true;
  console.log(`\n🚀 Triggering Task ${taskIndex + 1} (${taskId})...`);

  try {
    // Update task status first
    const taskRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskRef, {
      status: 'Needs attention',
      updatedAt: Timestamp.now(),
    });

    console.log(`  ✓ Updated status to "Needs attention"`);

    // Trigger the API
    const response = await fetch('http://localhost:9003/api/ai-task-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        companyId,
        workflowId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ API Error:`, error);
      isProcessing = false;
      return false;
    }

    const result = await response.json();
    console.log(`  ✅ Task ${taskIndex + 1} triggered successfully`);
    console.log(`     - Completed: ${result.taskCompleted}`);
    console.log(`     - Documents used: ${result.documentsUsed}`);
    console.log(`     - Artifacts used: ${result.artifactsUsed}`);

    isProcessing = false;
    return true;
  } catch (error) {
    console.error(`  ❌ Error triggering task:`, error.message);
    isProcessing = false;
    return false;
  }
}

async function monitorWorkflow() {
  console.log('🔍 Monitoring workflow:', workflowId);
  console.log('📡 Listening for task status changes...\n');

  const workflowRef = doc(db, 'buildPackageWorkflows', workflowId);

  const unsubscribe = onSnapshot(workflowRef, async (snapshot) => {
    if (!snapshot.exists()) {
      console.log('❌ Workflow not found');
      return;
    }

    const workflow = snapshot.data();
    const allTaskIds = workflow.taskIds || [];
    const aiTaskIds = allTaskIds.slice(3, 8); // Tasks 4-8

    console.log(`\n📊 Workflow Status (${new Date().toLocaleTimeString()}):`);
    console.log(`   Phase: ${workflow.phase}`);
    console.log(`   Status: ${workflow.status}`);

    // Check status of each AI task
    for (let i = 0; i < aiTaskIds.length; i++) {
      const taskId = aiTaskIds[i];
      if (!taskId) continue;

      const taskRef = doc(db, 'companyTasks', taskId);
      const taskSnap = await taskRef.get?.() || await new Promise((resolve) => {
        onSnapshot(taskRef, (snap) => resolve(snap), { source: 'cache' });
      });

      // Fetch task status directly
      const taskDocRef = doc(db, 'companyTasks', taskId);
      onSnapshot(taskDocRef, async (taskSnapshot) => {
        if (!taskSnapshot.exists()) return;

        const task = taskSnapshot.data();
        const taskIndex = i + 4; // Task number (4-8)
        const prevStatus = taskStatuses[taskId];

        taskStatuses[taskId] = task.status;

        // Print status
        const statusEmoji = task.status === 'completed' ? '✅' :
                           task.status === 'Needs attention' ? '⏳' :
                           task.status === 'Upcoming' ? '⏹️' : '🔄';

        console.log(`   ${statusEmoji} Task ${taskIndex}: ${task.taskName} - ${task.status}`);

        // If this task just completed and is not the last task
        if (prevStatus !== 'completed' && task.status === 'completed' && i < aiTaskIds.length - 1) {
          const nextTaskId = aiTaskIds[i + 1];
          const nextTaskIndex = i + 1;

          console.log(`\n✅ Task ${taskIndex} completed!`);

          // Check if next task is still "Upcoming"
          const nextTaskRef = doc(db, 'companyTasks', nextTaskId);
          const nextTaskSnap = await new Promise((resolve) => {
            const unsub = onSnapshot(nextTaskRef, (snap) => {
              unsub();
              resolve(snap);
            });
          });

          if (nextTaskSnap.exists()) {
            const nextTask = nextTaskSnap.data();
            if (nextTask.status === 'Upcoming') {
              console.log(`⏭️  Next task (Task ${taskIndex + 1}) is still Upcoming, triggering...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              await triggerTask(nextTaskId, nextTaskIndex);
            } else {
              console.log(`✓ Next task already ${nextTask.status}`);
            }
          }
        }

        // If this is the last task and it just completed
        if (prevStatus !== 'completed' && task.status === 'completed' && i === aiTaskIds.length - 1) {
          console.log(`\n🎉 All tasks completed! Workflow should move to review phase.`);
        }
      });
    }
  });

  // Keep the script running
  console.log('\n✅ Monitoring active. Press Ctrl+C to stop.\n');
}

monitorWorkflow().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
