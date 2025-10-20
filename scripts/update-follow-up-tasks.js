const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, writeBatch } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateFollowUpTasks() {
  try {
    console.log('📋 Reading task templates from JSON...');

    // Read the task templates
    const tasksPath = path.join(__dirname, '../workers-comp-tasks-complete.json');
    const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

    // Find the follow-up tasks (task 13 and 14)
    const draftFollowUpTask = tasksData.find(t => t.id === 'XajTm0iTsvZX4RIXGmD6'); // Task 13
    const sendFollowUpTask = tasksData.find(t => t.id === 'vNx8Pm2QkR5tLwY9ZaBc'); // Task 14

    if (!draftFollowUpTask) {
      console.error('❌ Task 13 (Draft follow-up emails) not found');
      return;
    }

    if (!sendFollowUpTask) {
      console.error('❌ Task 14 (Send follow-up emails) not found');
      return;
    }

    console.log('✅ Found both follow-up tasks');
    console.log('  Task 13:', draftFollowUpTask.taskName);
    console.log('  Task 14:', sendFollowUpTask.taskName);

    // Update task 13 in Firestore
    console.log('\n📝 Updating Task 13 in Firestore...');
    const task13Ref = doc(db, 'tasks', draftFollowUpTask.id);
    const task13Snap = await getDoc(task13Ref);

    if (task13Snap.exists()) {
      await updateDoc(task13Ref, {
        taskName: draftFollowUpTask.taskName,
        description: draftFollowUpTask.description,
        systemPrompt: draftFollowUpTask.systemPrompt,
        sortOrder: draftFollowUpTask.sortOrder
      });
      console.log('✅ Task 13 updated');
    } else {
      console.log('⚠️  Task 13 not found, creating it...');
      await setDoc(task13Ref, draftFollowUpTask);
      console.log('✅ Task 13 created');
    }

    // Create or update task 14 in Firestore
    console.log('\n📝 Creating/Updating Task 14 in Firestore...');
    const task14Ref = doc(db, 'tasks', sendFollowUpTask.id);
    const task14Snap = await getDoc(task14Ref);

    if (task14Snap.exists()) {
      await updateDoc(task14Ref, sendFollowUpTask);
      console.log('✅ Task 14 updated');
    } else {
      await setDoc(task14Ref, sendFollowUpTask);
      console.log('✅ Task 14 created');
    }

    // Update sortOrders for tasks 15-36 using batch
    console.log('\n📝 Updating sortOrders for subsequent tasks...');
    const tasksToUpdate = tasksData.filter(t => t.sortOrder >= 15);

    const batch = writeBatch(db);
    let updateCount = 0;
    let skipCount = 0;

    for (const task of tasksToUpdate) {
      const taskRef = doc(db, 'tasks', task.id);
      const taskSnap = await getDoc(taskRef);

      if (taskSnap.exists()) {
        batch.update(taskRef, { sortOrder: task.sortOrder });
        updateCount++;
      } else {
        console.log(`  ⚠️  Skipping ${task.taskName} (not in Firestore)`);
        skipCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Updated sortOrders for ${updateCount} tasks (${skipCount} skipped)`);
    } else {
      console.log(`⚠️  No tasks to update`);
    }

    // Update dependencies for task 15
    console.log('\n📝 Updating dependencies...');
    const task15 = tasksData.find(t => t.sortOrder === 15);
    if (task15) {
      const task15Ref = doc(db, 'tasks', task15.id);
      await updateDoc(task15Ref, {
        dependencies: task15.dependencies
      });
      console.log(`✅ Updated dependencies for Task 15 (${task15.taskName})`);
    }

    console.log('\n✨ All updates completed successfully!');
    console.log('\nSummary:');
    console.log('  - Task 13: Draft follow-up emails (updated)');
    console.log('  - Task 14: Send follow-up emails (created)');
    console.log('  - Tasks 15-36: sortOrders updated');

  } catch (error) {
    console.error('❌ Error updating tasks:', error);
    throw error;
  }
}

// Run the update
updateFollowUpTasks()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
