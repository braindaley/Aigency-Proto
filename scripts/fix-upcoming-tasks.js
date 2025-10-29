const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function fixUpcomingTasks() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const renewalType = 'workers-comp';
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== FIX UPCOMING TASKS ===\n');
  console.log(`Company: ${companyId}`);
  console.log(`Renewal Type: ${renewalType}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will make changes)'}\n`);

  // Get all company tasks
  const companyTasksRef = collection(db, 'companyTasks');
  const companyTasksQuery = query(
    companyTasksRef,
    where('companyId', '==', companyId),
    where('renewalType', '==', renewalType)
  );
  const companyTasksSnap = await getDocs(companyTasksQuery);

  const tasks = [];
  companyTasksSnap.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      name: data.taskName,
      sortOrder: data.sortOrder || 0,
      status: data.status,
      phase: data.phase,
      tag: data.tag,
      dependencies: data.dependencies || [],
      templateId: data.templateId,
      companyId: data.companyId
    });
  });

  // Find tasks that should be "Needs attention"
  const tasksToFix = [];

  for (const task of tasks) {
    if (task.status !== 'Upcoming') continue;

    // Check if all dependencies are met
    let allCompleted = true;
    if (task.dependencies.length === 0) {
      // No dependencies = should be "Needs attention"
      tasksToFix.push({
        task,
        reason: 'No dependencies',
        depsMet: []
      });
      continue;
    }

    const depsMet = [];
    for (const depId of task.dependencies) {
      const depTask = tasks.find(t => t.templateId === depId || t.id === depId);
      if (!depTask || depTask.status !== 'completed') {
        allCompleted = false;
        break;
      }
      depsMet.push(depTask.name);
    }

    if (allCompleted) {
      tasksToFix.push({
        task,
        reason: 'All dependencies completed',
        depsMet
      });
    }
  }

  if (tasksToFix.length === 0) {
    console.log('✅ No tasks need fixing. All statuses are correct!\n');
    return;
  }

  console.log(`Found ${tasksToFix.length} task(s) to fix:\n`);

  for (const { task, reason, depsMet } of tasksToFix) {
    console.log(`📋 Task ${task.sortOrder}: ${task.name}`);
    console.log(`   Current Status: ${task.status}`);
    console.log(`   Should Be: Needs attention`);
    console.log(`   Reason: ${reason}`);
    if (depsMet.length > 0) {
      console.log(`   Dependencies met:`);
      depsMet.forEach(dep => console.log(`     ✅ ${dep}`));
    }
    console.log('');
  }

  if (dryRun) {
    console.log('=== DRY RUN COMPLETE ===\n');
    console.log('No changes were made.');
    console.log('Run without --dry-run to apply changes.\n');
    return;
  }

  console.log('=== APPLYING FIXES ===\n');

  const aiTasksToTrigger = [];

  for (const { task } of tasksToFix) {
    try {
      const taskRef = doc(db, 'companyTasks', task.id);
      await updateDoc(taskRef, {
        status: 'Needs attention',
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Updated: ${task.name}`);

      // Track AI tasks for auto-trigger
      if (task.tag === 'ai') {
        aiTasksToTrigger.push(task);
      }
    } catch (error) {
      console.error(`❌ Failed to update ${task.name}:`, error.message);
    }
  }

  console.log(`\n✅ Fixed ${tasksToFix.length} task(s)\n`);

  // Auto-trigger AI tasks
  if (aiTasksToTrigger.length > 0) {
    console.log('=== TRIGGERING AI TASKS ===\n');

    for (const task of aiTasksToTrigger) {
      try {
        console.log(`🤖 Triggering: ${task.name}`);

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9003';
        const response = await fetch(`${baseUrl}/api/ai-task-completion-async`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            companyId: task.companyId
          }),
        });

        if (response.ok) {
          console.log(`   ✅ AI task triggered successfully`);
        } else {
          const error = await response.text();
          console.log(`   ⚠️  Failed to trigger: ${error}`);
        }
      } catch (error) {
        console.error(`   ❌ Error triggering AI:`, error.message);
      }
    }

    console.log('');
  }

  console.log('=== COMPLETE ===\n');
}

fixUpcomingTasks().catch(console.error);
