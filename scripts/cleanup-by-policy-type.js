/**
 * Policy-type-aware cleanup: Keep best version of each template PER policy type
 * Workers-comp, auto, general-liability, and property tasks are kept separate
 */

const fs = require('fs');
const path = require('path');

async function cleanupByPolicyType() {
  console.log('🧹 Policy-type-aware cleanup...\n');

  try {
    // Fetch all templates from Firebase
    console.log('📡 Fetching all templates from Firebase...');
    const response = await fetch('http://localhost:9003/api/data/tasks');
    if (!response.ok) {
      throw new Error('Failed to fetch tasks from Firebase');
    }

    const allTemplates = await response.json();
    console.log(`   Found ${allTemplates.length} total templates\n`);

    // Group by policy type AND task name
    const templatesByPolicyAndName = {};
    allTemplates.forEach(template => {
      const policyType = template.policyType || template.renewalType || 'unspecified';
      const taskName = template.taskName || 'Unnamed';
      const key = `${policyType}::${taskName}`;

      if (!templatesByPolicyAndName[key]) {
        templatesByPolicyAndName[key] = {
          policyType,
          taskName,
          templates: []
        };
      }
      templatesByPolicyAndName[key].templates.push(template);
    });

    // Analyze by policy type
    const policyTypes = {};
    Object.values(templatesByPolicyAndName).forEach(group => {
      if (!policyTypes[group.policyType]) {
        policyTypes[group.policyType] = {
          total: 0,
          unique: 0,
          duplicates: 0
        };
      }
      policyTypes[group.policyType].total += group.templates.length;
      policyTypes[group.policyType].unique += 1;
      if (group.templates.length > 1) {
        policyTypes[group.policyType].duplicates += 1;
      }
    });

    console.log('📊 Analysis by Policy Type:');
    Object.entries(policyTypes).sort((a, b) => b[1].total - a[1].total).forEach(([type, stats]) => {
      console.log(`\n  ${type}:`);
      console.log(`    Total templates: ${stats.total}`);
      console.log(`    Unique tasks: ${stats.unique}`);
      console.log(`    Tasks with duplicates: ${stats.duplicates}`);
      console.log(`    Duplicates to remove: ${stats.total - stats.unique}`);
    });
    console.log('');

    // For each group, pick the BEST one
    const templatesToKeep = [];
    const templatesToDelete = [];

    Object.values(templatesByPolicyAndName).forEach(group => {
      if (group.templates.length === 1) {
        // Single instance - keep it
        templatesToKeep.push(group.templates[0]);
      } else {
        // Multiple instances - pick the best
        const scored = group.templates.map(t => ({
          template: t,
          score: (
            (t.tag === 'ai' ? 1000 : 0) +
            (t.systemPrompt && t.systemPrompt.length > 100 ? 500 : 0) +
            (t.showDependencyArtifacts ? 250 : 0) +
            (t.testCriteria ? 100 : 0) +
            (t.updatedAt ? 50 : 0)
          )
        }));

        scored.sort((a, b) => b.score - a.score);

        // Keep the best one
        const best = scored[0].template;
        templatesToKeep.push(best);

        // Delete the rest
        for (let i = 1; i < scored.length; i++) {
          templatesToDelete.push(scored[i].template);
        }
      }
    });

    console.log('=' .repeat(60));
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`   Current templates: ${allTemplates.length}`);
    console.log(`   Templates to KEEP: ${templatesToKeep.length}`);
    console.log(`   Templates to DELETE: ${templatesToDelete.length}`);
    console.log(`   After cleanup: ${templatesToKeep.length} templates\n`);

    // Show what will be kept by policy type
    const keepByPolicy = {};
    templatesToKeep.forEach(t => {
      const policy = t.policyType || t.renewalType || 'unspecified';
      keepByPolicy[policy] = (keepByPolicy[policy] || 0) + 1;
    });

    console.log('📋 Templates to KEEP by policy type:');
    Object.entries(keepByPolicy).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} templates`);
    });
    console.log('');

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
      byPolicyType: policyTypes,
      deleteList: templatesToDelete.map(t => ({
        id: t.id,
        taskName: t.taskName,
        policyType: t.policyType || t.renewalType || 'unspecified',
        tag: t.tag,
        phase: t.phase
      })),
      keepList: templatesToKeep.map(t => ({
        id: t.id,
        taskName: t.taskName,
        policyType: t.policyType || t.renewalType || 'unspecified',
        tag: t.tag,
        phase: t.phase,
        showDependencyArtifacts: t.showDependencyArtifacts
      }))
    };

    const planFile = path.join(__dirname, '../deletion-plan-by-policy.json');
    fs.writeFileSync(planFile, JSON.stringify(deletionPlan, null, 2));

    console.log(`✅ Deletion plan saved: ${planFile}\n`);
    console.log('🔍 Review the plan:');
    console.log(`   cat deletion-plan-by-policy.json | jq '.byPolicyType'`);
    console.log(`   cat deletion-plan-by-policy.json | jq '.keepList | group_by(.policyType)'`);
    console.log('');
    console.log('🚀 To execute cleanup:');
    console.log('   node scripts/execute-policy-aware-cleanup.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the cleanup analysis
cleanupByPolicyType();
