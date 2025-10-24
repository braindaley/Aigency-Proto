/**
 * Keep the BEST version of each of the 49 workers-comp tasks
 * Delete all duplicates
 */

const fs = require('fs');
const path = require('path');

async function cleanup49Best() {
  console.log('🧹 Cleaning up workers-comp templates - keeping 49 best...\n');

  try {
    // Fetch all workers-comp templates from Firebase
    console.log('📡 Fetching workers-comp templates from Firebase...');
    const response = await fetch('http://localhost:9003/api/data/tasks');
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    const allTasks = await response.json();
    const workersCompTasks = allTasks.filter(t => t.policyType === 'workers-comp');

    console.log(`   Found ${workersCompTasks.length} workers-comp templates\n`);

    // Group by task name
    const tasksByName = {};
    workersCompTasks.forEach(task => {
      const name = task.taskName || 'Unnamed';
      if (!tasksByName[name]) {
        tasksByName[name] = [];
      }
      tasksByName[name].push(task);
    });

    const uniqueNames = Object.keys(tasksByName);
    console.log(`📊 Analysis:`);
    console.log(`   Unique task names: ${uniqueNames.length}`);
    console.log(`   Total templates: ${workersCompTasks.length}`);
    console.log(`   Duplicates to remove: ${workersCompTasks.length - uniqueNames.length}\n`);

    // For each task name, pick the BEST version
    const toKeep = [];
    const toDelete = [];

    uniqueNames.forEach(taskName => {
      const tasks = tasksByName[taskName];

      if (tasks.length === 1) {
        // No duplicates - keep it
        toKeep.push(tasks[0]);
      } else {
        // Multiple versions - pick the best
        console.log(`📌 "${taskName}" (${tasks.length} versions)`);

        const scored = tasks.map(t => ({
          template: t,
          score: (
            (t.tag === 'ai' ? 1000 : 0) +  // AI preferred
            (t.systemPrompt && t.systemPrompt.length > 100 ? 500 : 0) +  // Has good prompt
            (t.showDependencyArtifacts ? 250 : 0) +  // Uses dependencies
            (t.testCriteria ? 100 : 0) +  // Has validation
            (t.updatedAt ? 50 : 0)  // Recently updated
          )
        }));

        scored.sort((a, b) => b.score - a.score);

        const best = scored[0].template;
        toKeep.push(best);

        console.log(`   Keeping: ${best.id} (tag: ${best.tag}, score: ${scored[0].score})`);
        console.log(`   Deleting: ${tasks.length - 1} duplicate(s)`);

        // Delete the rest
        for (let i = 1; i < scored.length; i++) {
          toDelete.push(scored[i].template);
        }
      }
    });

    console.log('');
    console.log('=' .repeat(60));
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`   Current templates: ${workersCompTasks.length}`);
    console.log(`   Templates to KEEP: ${toKeep.length}`);
    console.log(`   Templates to DELETE: ${toDelete.length}`);
    console.log(`   After cleanup: ${toKeep.length} templates\n`);

    if (toKeep.length !== uniqueNames.length) {
      console.error(`❌ ERROR: Expected to keep ${uniqueNames.length} but got ${toKeep.length}`);
      return;
    }

    // Create backup
    const backupPath = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const backupFile = path.join(backupPath, `before-49-cleanup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(workersCompTasks, null, 2));
    console.log(`✅ Backup created: ${backupFile}\n`);

    // Save deletion plan
    const deletionPlan = {
      timestamp: new Date().toISOString(),
      totalTemplates: workersCompTasks.length,
      uniqueTasks: uniqueNames.length,
      toKeep: toKeep.length,
      toDelete: toDelete.length,
      deleteIds: toDelete.map(t => t.id),
      keepIds: toKeep.map(t => t.id),
      deleteList: toDelete.map(t => ({
        id: t.id,
        taskName: t.taskName,
        tag: t.tag,
        phase: t.phase
      })),
      keepList: toKeep.map(t => ({
        id: t.id,
        taskName: t.taskName,
        tag: t.tag,
        phase: t.phase,
        showDependencyArtifacts: t.showDependencyArtifacts
      }))
    };

    const planFile = path.join(__dirname, '../final-cleanup-plan.json');
    fs.writeFileSync(planFile, JSON.stringify(deletionPlan, null, 2));
    console.log(`✅ Deletion plan saved: ${planFile}\n`);

    console.log('🚀 To execute cleanup:');
    console.log('   node scripts/execute-final-cleanup.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the analysis
cleanup49Best();
