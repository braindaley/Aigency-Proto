/**
 * Smart cleanup: Keep the BEST version of each duplicate template
 * Prioritizes: AI-enabled > Has system prompt > Most recent
 */

const fs = require('fs');
const path = require('path');

async function cleanupKeepBestTemplates() {
  console.log('🧹 Smart cleanup: Keeping best version of each template...\n');

  try {
    // Fetch all templates from Firebase
    console.log('📡 Fetching all templates from Firebase...');
    const response = await fetch('http://localhost:9003/api/data/tasks');
    if (!response.ok) {
      throw new Error('Failed to fetch tasks from Firebase');
    }

    const allTemplates = await response.json();
    console.log(`   Found ${allTemplates.length} total templates\n`);

    // Group by task name
    const templatesByName = {};
    allTemplates.forEach(template => {
      const name = template.taskName || 'Unnamed';
      if (!templatesByName[name]) {
        templatesByName[name] = [];
      }
      templatesByName[name].push(template);
    });

    // Find duplicates
    const duplicates = Object.entries(templatesByName).filter(([name, templates]) => templates.length > 1);
    const singles = Object.entries(templatesByName).filter(([name, templates]) => templates.length === 1);

    console.log(`📊 Analysis:`);
    console.log(`   Unique task names: ${Object.keys(templatesByName).length}`);
    console.log(`   Single instances: ${singles.length}`);
    console.log(`   Duplicates: ${duplicates.length}\n`);

    // For each set of duplicates, pick the BEST one
    const templatesToKeep = [];
    const templatesToDelete = [];

    // Keep all singles
    singles.forEach(([name, templates]) => {
      templatesToKeep.push(templates[0]);
    });

    // For duplicates, pick the best one
    duplicates.forEach(([name, templates]) => {
      // Sort by quality score (best first)
      const scored = templates.map(t => ({
        template: t,
        score: (
          (t.tag === 'ai' ? 1000 : 0) +  // AI gets highest priority
          (t.systemPrompt && t.systemPrompt.length > 100 ? 500 : 0) +  // Has good system prompt
          (t.showDependencyArtifacts ? 250 : 0) +  // Has dependency artifacts enabled
          (t.testCriteria ? 100 : 0) +  // Has test criteria
          (t.updatedAt ? 50 : 0)  // Has been updated
        )
      }));

      scored.sort((a, b) => b.score - a.score);

      // Keep the best one, delete the rest
      const best = scored[0].template;
      templatesToKeep.push(best);

      for (let i = 1; i < scored.length; i++) {
        templatesToDelete.push(scored[i].template);
      }

      console.log(`📌 "${name}"`);
      console.log(`   Keeping: ${best.id} (tag: ${best.tag}, score: ${scored[0].score})`);
      console.log(`   Deleting: ${templates.length - 1} duplicate(s)`);
    });

    console.log('');
    console.log('=' .repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`   Templates to KEEP: ${templatesToKeep.length}`);
    console.log(`   Templates to DELETE: ${templatesToDelete.length}\n`);

    // Create backup
    const backupPath = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const backupFile = path.join(backupPath, `templates-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(allTemplates, null, 2));
    console.log(`✅ Backup created: ${backupFile}\n`);

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
        phase: t.phase,
        showDependencyArtifacts: t.showDependencyArtifacts
      }))
    };

    const planFile = path.join(__dirname, '../deletion-plan.json');
    fs.writeFileSync(planFile, JSON.stringify(deletionPlan, null, 2));

    console.log(`✅ Deletion plan saved: ${planFile}\n`);
    console.log('🚀 NEXT STEPS:');
    console.log('   1. Review the deletion plan above');
    console.log('   2. Check: cat deletion-plan.json | jq .keepList');
    console.log('   3. To execute: node scripts/execute-simple-cleanup.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the cleanup analysis
cleanupKeepBestTemplates();
