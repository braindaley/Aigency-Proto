const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function checkTaskDependencies() {
  // Get all tasks for the company
  const tasksSnapshot = await db.collection('companyTasks')
    .where('companyId', '==', 'hkDZmFfhLVy7cAqxdfsz')
    .get();

  const tasks = [];
  tasksSnapshot.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: doc.id,
      taskName: data.taskName,
      status: data.status,
      dependencies: data.dependencies || [],
      sortOrder: data.sortOrder,
      phase: data.phase,
      templateId: data.templateId
    });
  });

  // Sort by sortOrder
  tasks.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

  console.log('Tasks and their dependencies for company hkDZmFfhLVy7cAqxdfsz:\n');
  tasks.forEach(task => {
    console.log(`${task.sortOrder || '?'}. ${task.taskName}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Template ID: ${task.templateId}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Phase: ${task.phase}`);
    console.log(`   Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`);

    // Check if dependencies are met
    if (task.dependencies.length > 0) {
      const depsMet = task.dependencies.every(depId => {
        const depTask = tasks.find(t => t.id === depId || t.templateId === depId || t.templateId === parseInt(depId));
        return depTask && depTask.status === 'completed';
      });
      console.log(`   Dependencies Met: ${depsMet}`);
    }
    console.log('');
  });

  // Find tasks that should be "Needs attention"
  console.log('\n--- ANALYSIS ---');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const needsAttentionTasks = tasks.filter(t => t.status === 'Needs attention');
  const upcomingTasks = tasks.filter(t => t.status === 'Upcoming');

  console.log(`Completed: ${completedTasks.length} tasks`);
  completedTasks.forEach(t => console.log(`  - ${t.taskName}`));

  console.log(`\nNeeds Attention: ${needsAttentionTasks.length} tasks`);
  needsAttentionTasks.forEach(t => console.log(`  - ${t.taskName}`));

  console.log(`\nUpcoming: ${upcomingTasks.length} tasks`);
  upcomingTasks.forEach(t => {
    console.log(`  - ${t.taskName}`);
    if (t.dependencies.length > 0) {
      const depsMet = t.dependencies.every(depId => {
        const depTask = tasks.find(task => task.id === depId || task.templateId === depId || task.templateId === parseInt(depId));
        return depTask && depTask.status === 'completed';
      });
      if (depsMet) {
        console.log(`    ⚠️ WARNING: This task's dependencies are met but it's still "Upcoming"!`);
      }
    }
  });
}

checkTaskDependencies().then(() => process.exit(0)).catch(console.error);