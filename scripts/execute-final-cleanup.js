/**
 * Execute the final cleanup - keep 48 best workers-comp templates
 */

const fs = require('fs');
const path = require('path');

async function executeFinalCleanup() {
  console.log('🚀 Executing final cleanup...\n');

  try {
    // Load the deletion plan
    const planFile = path.join(__dirname, '../final-cleanup-plan.json');
    if (!fs.existsSync(planFile)) {
      console.error('❌ No deletion plan found!');
      console.log('   Run: node scripts/cleanup-keep-49-best.js first\n');
      return;
    }

    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

    console.log('📋 Final Cleanup Plan:');
    console.log(`   Current templates: ${plan.totalTemplates}`);
    console.log(`   Unique tasks: ${plan.uniqueTasks}`);
    console.log(`   To KEEP: ${plan.toKeep}`);
    console.log(`   To DELETE: ${plan.toDelete}\n`);

    if (plan.toDelete === 0) {
      console.log('✅ No templates to delete!');
      return;
    }

    console.log(`⚠️  Deleting ${plan.toDelete} duplicate templates...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Delete in batches of 10
    const batchSize = 10;
    const deleteIds = plan.deleteIds;

    for (let i = 0; i < deleteIds.length; i += batchSize) {
      const batch = deleteIds.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(deleteIds.length / batchSize);

      console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} templates)...`);

      const promises = batch.map(async (templateId) => {
        try {
          const response = await fetch('http://localhost:9003/api/task-templates/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId })
          });

          if (response.ok) {
            successCount++;
            return { success: true, id: templateId };
          } else {
            const error = await response.text();
            errorCount++;
            errors.push({ templateId, error });
            return { success: false, id: templateId, error };
          }
        } catch (error) {
          errorCount++;
          errors.push({ templateId, error: error.message });
          return { success: false, id: templateId, error: error.message };
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < deleteIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ CLEANUP COMPLETE!\n');
    console.log(`   Templates deleted: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    console.log(`   Remaining: ${plan.toKeep} templates\n`);

    if (errors.length > 0) {
      console.log('❌ Errors:');
      errors.slice(0, 10).forEach(err => {
        console.log(`   ${err.templateId}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
      console.log('');
    }

    console.log('🎯 Next steps:');
    console.log('   1. Verify templates: node scripts/check-duplicate-templates.js');
    console.log('   2. Export final templates: node scripts/export-final-templates.js');
    console.log('   3. Check settings page: http://localhost:9003/settings/task-settings/workers-comp\n');

    // Clean up the deletion plan
    fs.unlinkSync(planFile);
    console.log('🧹 Deletion plan removed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the cleanup
executeFinalCleanup();
