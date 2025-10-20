const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../service-account.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'aigency-proto'
});

const db = getFirestore();

async function fixACORD130Task() {
  const COMPANY_ID = 'hkDZmFfhLVy7cAqxdfsz';
  const TASK_ID = 'VL6bva4A1DSCwFVu4q5x';

  console.log('🔧 Fixing ACORD 130 task...');

  try {
    // 1. Clean up duplicate messages in chat
    console.log('📧 Checking for duplicate messages...');
    const messagesRef = db.collection('taskChats').doc(TASK_ID).collection('messages');
    const messagesSnapshot = await messagesRef.orderBy('timestamp', 'asc').get();

    const messagesByContent = new Map();
    const duplicatesToDelete = [];

    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      const content = data.content;

      // Check if we've seen this content before
      if (messagesByContent.has(content)) {
        // This is a duplicate
        duplicatesToDelete.push(doc.id);
        console.log(`  Found duplicate message: ${doc.id} (${content.substring(0, 50)}...)`);
      } else {
        messagesByContent.set(content, doc.id);
      }
    });

    // Delete duplicate messages
    if (duplicatesToDelete.length > 0) {
      console.log(`🗑️  Deleting ${duplicatesToDelete.length} duplicate messages...`);
      for (const docId of duplicatesToDelete) {
        await messagesRef.doc(docId).delete();
        console.log(`  Deleted: ${docId}`);
      }
    } else {
      console.log('✅ No duplicate messages found');
    }

    // 2. Check if task needs to be auto-completed
    const taskRef = db.collection('companyTasks').doc(TASK_ID);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      console.error('❌ Task not found!');
      return;
    }

    const task = taskDoc.data();
    console.log(`📋 Task status: ${task.status}`);
    console.log(`🏷️  Task tag: ${task.tag}`);
    console.log(`🔗 Dependencies: ${task.dependencies ? task.dependencies.join(', ') : 'None'}`);

    if (task.status !== 'completed' && task.tag === 'ai') {
      console.log('🤖 This is an AI task that should be auto-completed');

      // Check if dependencies are met
      if (task.dependencies && task.dependencies.length > 0) {
        console.log('Checking dependencies...');

        // Get all company tasks to check dependency completion
        const companyTasksSnapshot = await db.collection('companyTasks')
          .where('companyId', '==', COMPANY_ID)
          .get();

        const tasksByTemplateId = new Map();
        companyTasksSnapshot.forEach(doc => {
          const data = doc.data();
          tasksByTemplateId.set(data.templateId, { id: doc.id, ...data });
        });

        let allDependenciesMet = true;
        for (const depId of task.dependencies) {
          const depTask = tasksByTemplateId.get(depId);
          if (!depTask || depTask.status !== 'completed') {
            console.log(`  ❌ Dependency not met: ${depId} (${depTask ? depTask.status : 'not found'})`);
            allDependenciesMet = false;
          } else {
            console.log(`  ✅ Dependency met: ${depId} (${depTask.taskName})`);
          }
        }

        if (allDependenciesMet) {
          console.log('✅ All dependencies are met!');
          console.log('🚀 Triggering AI task completion...');

          // Call the AI task completion endpoint
          const response = await fetch('http://localhost:9002/api/ai-task-completion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: TASK_ID,
              companyId: COMPANY_ID
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ AI task completion triggered successfully!');
            console.log('📄 Artifact created:', result.artifactId ? 'Yes' : 'No');
          } else {
            console.error('❌ Failed to trigger AI task completion:', response.status);
            const error = await response.text();
            console.error('Error:', error);
          }
        } else {
          console.log('⏳ Dependencies not yet met, task cannot be auto-completed');
        }
      }
    } else if (task.status === 'completed') {
      console.log('✅ Task is already completed');
    } else {
      console.log('ℹ️  This is a manual task, no auto-completion needed');
    }

    console.log('\n✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixACORD130Task();