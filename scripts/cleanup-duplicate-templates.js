/**
 * Cleanup duplicate task templates in Firebase
 * Keeps only canonical templates from workers-comp-tasks-complete.json
 */

const fs = require('fs');
const path = require('path');

async function cleanupDuplicateTemplates() {
  console.log('🧹 Cleaning up duplicate task templates...\n');

  try {
    // Step 1: Load canonical templates from JSON
    console.log('📋 Step 1: Loading canonical templates from workers-comp-tasks-complete.json...');
    const canonicalTemplates = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );
    console.log(`   Found ${canonicalTemplates.length} canonical templates\n`);

    // Create a map of canonical IDs
    const canonicalIds = new Set(canonicalTemplates.map(t => t.id));
    console.log('   Canonical template IDs:');
    canonicalTemplates.forEach(t => {
      console.log(`   - ${t.id}: ${t.taskName}`);
    });
    console.log('');

    // Step 2: Fetch all templates from Firebase
    console.log('📡 Step 2: Fetching all templates from Firebase...');
    const response = await fetch('http://localhost:9003/api/data/tasks');
    if (!response.ok) {
      throw new Error('Failed to fetch tasks from Firebase');
    }

    const allTemplates = await response.json();
    console.log(`   Found ${allTemplates.length} total templates in Firebase\n`);

    // Step 3: Identify duplicates and templates to delete
    console.log('🔍 Step 3: Identifying duplicates...');

    const templatesByName = {};
    allTemplates.forEach(template => {
      const name = template.taskName || 'Unnamed';
      if (!templatesByName[name]) {
        templatesByName[name] = [];
      }
      templatesByName[name].push(template);
    });

    const duplicates = Object.entries(templatesByName).filter(([name, templates]) => templates.length > 1);
    console.log(`   Found ${duplicates.length} task names with duplicates\n`);

    // Step 4: Create deletion plan
    console.log('📝 Step 4: Creating deletion plan...');
    const templatesToDelete = [];
    const templatesToKeep = [];

    allTemplates.forEach(template => {
      if (canonicalIds.has(template.id)) {
        // This is a canonical template - keep it
        templatesToKeep.push(template);
      } else {
        // This is a duplicate or old template - delete it
        templatesToDelete.push(template);
      }
    });

    console.log(`   Templates to KEEP: ${templatesToKeep.length}`);
    console.log(`   Templates to DELETE: ${templatesToDelete.length}\n`);

    // Step 5: Show what will be deleted
    console.log('⚠️  Step 5: Templates that will be DELETED:');
    const deleteGroups = {};
    templatesToDelete.forEach(template => {
      const name = template.taskName || 'Unnamed';
      if (!deleteGroups[name]) {
        deleteGroups[name] = [];
      }
      deleteGroups[name].push(template.id);
    });

    Object.entries(deleteGroups).forEach(([name, ids]) => {
      console.log(`   "${name}": ${ids.length} duplicate(s)`);
      ids.forEach(id => console.log(`      - ${id}`));
    });
    console.log('');

    // Step 6: Confirmation
    console.log('=' .repeat(60));
    console.log('🎯 SUMMARY:');
    console.log(`   Current templates in Firebase: ${allTemplates.length}`);
    console.log(`   Templates to keep: ${templatesToKeep.length}`);
    console.log(`   Templates to delete: ${templatesToDelete.length}`);
    console.log(`   After cleanup: ${templatesToKeep.length} templates\n`);

    console.log('⚠️  WARNING: This will delete templates from Firebase!');
    console.log('   Make sure you have a backup before proceeding.\n');

    console.log('📦 BACKUP CREATED:');
    const backupPath = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const backupFile = path.join(backupPath, `templates-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(allTemplates, null, 2));
    console.log(`   All templates backed up to: ${backupFile}\n`);

    console.log('🚀 NEXT STEPS:');
    console.log('   1. Review the deletion plan above');
    console.log('   2. If it looks correct, run:');
    console.log('      node scripts/execute-template-cleanup.js\n');

    // Save deletion plan
    const deletionPlan = {
      timestamp: new Date().toISOString(),
      totalTemplates: allTemplates.length,
      templatesToKeep: templatesToKeep.length,
      templatesToDelete: templatesToDelete.length,
      deleteList: templatesToDelete.map(t => ({
        id: t.id,
        taskName: t.taskName,
        tag: t.tag,
        phase: t.phase
      })),
      keepList: templatesToKeep.map(t => ({
        id: t.id,
        taskName: t.taskName,
        tag: t.tag,
        phase: t.phase
      }))
    };

    const planFile = path.join(__dirname, '../deletion-plan.json');
    fs.writeFileSync(planFile, JSON.stringify(deletionPlan, null, 2));
    console.log(`✅ Deletion plan saved to: ${planFile}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the cleanup analysis
cleanupDuplicateTemplates();
