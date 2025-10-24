/**
 * Execute the policy-aware template cleanup
 * WARNING: This will permanently delete duplicate templates from Firebase!
 */

const fs = require('fs');
const path = require('path');

async function executeCleanup() {
  console.log('🚀 Executing policy-aware template cleanup...\n');

  try {
    // Load the deletion plan
    const planFile = path.join(__dirname, '../deletion-plan-by-policy.json');
    if (!fs.existsSync(planFile)) {
      console.error('❌ No deletion plan found!');
      console.log('   Run: node scripts/cleanup-by-policy-type.js first\n');
      return;
    }

    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

    console.log('📋 Deletion Plan Summary:');
    console.log(`   Total templates: ${plan.totalTemplates}`);
    console.log(`   To keep: ${plan.templatesToKeep}`);
    console.log(`   To delete: ${plan.templatesToDelete}\n`);

    console.log('📊 By Policy Type:');
    Object.entries(plan.byPolicyType).forEach(([type, stats]) => {
      console.log(`   ${type}:`);
      console.log(`     Current: ${stats.total} → After: ${stats.unique}`);
      console.log(`     Removing: ${stats.total - stats.unique} duplicates`);
    });
    console.log('');

    if (plan.templatesToDelete === 0) {
      console.log('✅ No templates to delete. Nothing to do!');
      return;
    }

    console.log(`⚠️  About to delete ${plan.templatesToDelete} templates from Firebase!\n`);
    console.log('🗑️  Deleting templates...\n');

    // Delete templates using client-side Firebase
    // We'll use the existing db instance from our API
    const deleteIds = plan.deleteList.map(t => t.id);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Delete in batches of 10 to avoid overwhelming Firebase
    const batchSize = 10;
    for (let i = 0; i < deleteIds.length; i += batchSize) {
      const batch = deleteIds.slice(i, i + batchSize);

      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(deleteIds.length / batchSize)} (${batch.length} templates)...`);

      // Call the API for each template in the batch
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

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.slice(0, 10).forEach(err => {
        console.log(`   ${err.templateId}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    console.log('\n🎯 Next steps:');
    console.log('   1. Template cache will be cleared automatically');
    console.log('   2. Refresh any open pages to see the changes');
    console.log('   3. Verify: node scripts/check-duplicate-templates.js\n');

    // Clean up the deletion plan
    fs.unlinkSync(planFile);
    console.log('🧹 Deletion plan file removed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the cleanup
executeCleanup();
