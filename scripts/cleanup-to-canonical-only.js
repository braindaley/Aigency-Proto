/**
 * Delete all workers-comp templates EXCEPT the canonical ones from workers-comp-tasks-complete.json
 */

const fs = require('fs');
const path = require('path');

async function cleanupToCanonicalOnly() {
  console.log('🧹 Cleaning up to canonical templates only...\n');

  try {
    // Load canonical template IDs from JSON
    const canonicalTemplates = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    const canonicalIds = new Set(canonicalTemplates.map(t => t.id));
    console.log(`📋 Canonical workers-comp templates: ${canonicalIds.size}`);
    canonicalTemplates.forEach(t => {
      console.log(`   - ${t.id}: ${t.taskName}`);
    });
    console.log('');

    // Fetch all workers-comp templates from Firebase
    console.log('📡 Fetching workers-comp templates from Firebase...');
    const response = await fetch('http://localhost:9003/api/data/tasks');
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    const allTasks = await response.json();
    const workersCompTasks = allTasks.filter(t => t.policyType === 'workers-comp');

    console.log(`   Found ${workersCompTasks.length} workers-comp templates in Firebase\n`);

    // Identify templates to delete (not in canonical list)
    const toDelete = workersCompTasks.filter(t => !canonicalIds.has(t.id));
    const toKeep = workersCompTasks.filter(t => canonicalIds.has(t.id));

    console.log(`📊 Analysis:`);
    console.log(`   Canonical templates: ${canonicalIds.size}`);
    console.log(`   In Firebase: ${workersCompTasks.length}`);
    console.log(`   To KEEP: ${toKeep.length}`);
    console.log(`   To DELETE: ${toDelete.length}\n`);

    if (toKeep.length < canonicalIds.size) {
      console.log(`⚠️  WARNING: ${canonicalIds.size - toKeep.length} canonical templates are missing from Firebase!`);
      const missingIds = [...canonicalIds].filter(id => !workersCompTasks.find(t => t.id === id));
      console.log('   Missing canonical IDs:');
      missingIds.forEach(id => {
        const canonical = canonicalTemplates.find(t => t.id === id);
        console.log(`   - ${id}: ${canonical?.taskName}`);
      });
      console.log('');
    }

    if (toDelete.length === 0) {
      console.log('✅ No templates to delete. Database is already clean!');
      return;
    }

    // Show what will be deleted
    console.log('🗑️  Templates to DELETE (non-canonical):');
    const deleteByName = {};
    toDelete.forEach(t => {
      const name = t.taskName || 'Unnamed';
      if (!deleteByName[name]) {
        deleteByName[name] = [];
      }
      deleteByName[name].push(t.id);
    });

    Object.entries(deleteByName).forEach(([name, ids]) => {
      console.log(`   "${name}": ${ids.length} duplicate(s)`);
      ids.slice(0, 3).forEach(id => console.log(`      - ${id}`));
      if (ids.length > 3) {
        console.log(`      ... and ${ids.length - 3} more`);
      }
    });
    console.log('');

    // Create backup
    const backupPath = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const backupFile = path.join(backupPath, `canonical-cleanup-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(workersCompTasks, null, 2));
    console.log(`✅ Backup created: ${backupFile}\n`);

    // Save deletion plan
    const deletionPlan = {
      timestamp: new Date().toISOString(),
      canonicalCount: canonicalIds.size,
      databaseCount: workersCompTasks.length,
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
        phase: t.phase
      }))
    };

    const planFile = path.join(__dirname, '../canonical-deletion-plan.json');
    fs.writeFileSync(planFile, JSON.stringify(deletionPlan, null, 2));
    console.log(`✅ Deletion plan saved: ${planFile}\n`);

    console.log('🚀 To execute cleanup:');
    console.log('   node scripts/execute-canonical-cleanup.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the analysis
cleanupToCanonicalOnly();
