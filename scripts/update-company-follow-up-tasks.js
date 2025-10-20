const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } = require('firebase/firestore');
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

const COMPANY_ID = 'qsu1QXPB8TUK2P4QyDiy';

async function updateCompanyFollowUpTasks() {
  try {
    console.log('📋 Reading task templates from JSON...');

    // Read the task templates
    const tasksPath = path.join(__dirname, '../workers-comp-tasks-complete.json');
    const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

    // Find the follow-up tasks (task 13 and 14)
    const draftFollowUpTemplate = tasksData.find(t => t.id === 'XajTm0iTsvZX4RIXGmD6'); // Task 13
    const sendFollowUpTemplate = tasksData.find(t => t.id === 'vNx8Pm2QkR5tLwY9ZaBc'); // Task 14

    if (!draftFollowUpTemplate || !sendFollowUpTemplate) {
      console.error('❌ Follow-up task templates not found');
      return;
    }

    console.log('✅ Found task templates');
    console.log('  Task 13:', draftFollowUpTemplate.taskName);
    console.log('  Task 14:', sendFollowUpTemplate.taskName);

    // Get all company tasks
    console.log(`\n🔍 Finding company tasks for ${COMPANY_ID}...`);
    const companyTasksRef = collection(db, 'companyTasks');
    const q = query(companyTasksRef, where('companyId', '==', COMPANY_ID));
    const snapshot = await getDocs(q);

    console.log(`✅ Found ${snapshot.size} company tasks`);

    // Find Task 13 in company tasks
    let task13Doc = null;
    let task14Doc = null;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.templateId === 'XajTm0iTsvZX4RIXGmD6') {
        task13Doc = { id: doc.id, ...data };
      }
      if (data.templateId === 'vNx8Pm2QkR5tLwY9ZaBc') {
        task14Doc = { id: doc.id, ...data };
      }
    });

    // Update Task 13
    if (task13Doc) {
      console.log(`\n📝 Updating Task 13 (${task13Doc.id})...`);
      const task13Ref = doc(db, 'companyTasks', task13Doc.id);

      await updateDoc(task13Ref, {
        taskName: draftFollowUpTemplate.taskName,
        description: draftFollowUpTemplate.description,
        systemPrompt: draftFollowUpTemplate.systemPrompt,
        sortOrder: draftFollowUpTemplate.sortOrder,
        updatedAt: new Date()
      });

      console.log('✅ Task 13 updated');
    } else {
      console.log('⚠️  Task 13 not found in company tasks');
    }

    // Create Task 14 if it doesn't exist
    if (!task14Doc) {
      console.log('\n📝 Creating Task 14 for company...');

      // Create the new task 14
      const task14Data = {
        companyId: COMPANY_ID,
        templateId: sendFollowUpTemplate.id,
        taskName: sendFollowUpTemplate.taskName,
        description: sendFollowUpTemplate.description,
        systemPrompt: sendFollowUpTemplate.systemPrompt,
        policyType: sendFollowUpTemplate.policyType,
        phase: sendFollowUpTemplate.phase,
        tag: sendFollowUpTemplate.tag,
        status: 'Upcoming',
        dependencies: task13Doc ? [task13Doc.id] : [],
        sortOrder: sendFollowUpTemplate.sortOrder,
        renewalType: task13Doc ? task13Doc.renewalType : 'workers-comp',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate a new document ID
      const task14Ref = doc(collection(db, 'companyTasks'));
      await setDoc(task14Ref, task14Data);

      console.log(`✅ Task 14 created with ID: ${task14Ref.id}`);
      task14Doc = { id: task14Ref.id, ...task14Data };
    } else {
      console.log('\n📝 Updating existing Task 14...');
      const task14Ref = doc(db, 'companyTasks', task14Doc.id);

      await updateDoc(task14Ref, {
        taskName: sendFollowUpTemplate.taskName,
        description: sendFollowUpTemplate.description,
        systemPrompt: sendFollowUpTemplate.systemPrompt,
        sortOrder: sendFollowUpTemplate.sortOrder,
        dependencies: task13Doc ? [task13Doc.id] : task14Doc.dependencies,
        updatedAt: new Date()
      });

      console.log('✅ Task 14 updated');
    }

    // Update sortOrders and dependencies for subsequent tasks
    console.log('\n📝 Updating subsequent tasks...');
    const tasksToUpdate = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      // Find matching template
      const template = tasksData.find(t => t.id === data.templateId);

      if (template && template.sortOrder >= 15) {
        tasksToUpdate.push({
          id: doc.id,
          templateId: data.templateId,
          currentSortOrder: data.sortOrder,
          newSortOrder: template.sortOrder,
          taskName: data.taskName,
          currentDeps: data.dependencies || [],
          newDeps: template.dependencies || []
        });
      }
    });

    console.log(`  Found ${tasksToUpdate.length} tasks to update`);

    // Update each task
    for (const task of tasksToUpdate) {
      const taskRef = doc(db, 'companyTasks', task.id);

      // Map template dependencies to company task IDs
      const mappedDeps = [];
      for (const templateDepId of task.newDeps) {
        // Find the company task with this template ID
        const depTask = Array.from(snapshot.docs).find(
          d => d.data().templateId === templateDepId
        );

        if (depTask) {
          mappedDeps.push(depTask.id);
        } else if (templateDepId === 'vNx8Pm2QkR5tLwY9ZaBc' && task14Doc) {
          // Special case for new Task 14
          mappedDeps.push(task14Doc.id);
        }
      }

      await updateDoc(taskRef, {
        sortOrder: task.newSortOrder,
        dependencies: mappedDeps,
        updatedAt: new Date()
      });

      console.log(`  ✅ Updated ${task.taskName} (sortOrder: ${task.currentSortOrder} → ${task.newSortOrder})`);
    }

    console.log('\n✨ All company tasks updated successfully!');
    console.log('\nSummary:');
    console.log(`  - Company: ${COMPANY_ID}`);
    console.log(`  - Task 13: ${task13Doc ? 'Updated' : 'Not found'}`);
    console.log(`  - Task 14: ${task14Doc ? 'Updated' : 'Created'}`);
    console.log(`  - Subsequent tasks: ${tasksToUpdate.length} updated`);

  } catch (error) {
    console.error('❌ Error updating company tasks:', error);
    throw error;
  }
}

// Run the update
updateCompanyFollowUpTasks()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
