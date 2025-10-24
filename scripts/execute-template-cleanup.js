/**
 * Execute the template cleanup - DELETE duplicate templates from Firebase
 * WARNING: This will permanently delete templates!
 */

const fs = require('fs');
const path = require('path');

async function executeCleanup() {
  console.log('🚀 Executing template cleanup...\n');

  try {
    // Load the deletion plan
    const planFile = path.join(__dirname, '../deletion-plan.json');
    if (!fs.existsSync(planFile)) {
      console.error('❌ No deletion plan found!');
      console.log('   Run: node scripts/cleanup-duplicate-templates.js first\n');
      return;
    }

    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

    console.log('📋 Deletion Plan Summary:');
    console.log(`   Total templates: ${plan.totalTemplates}`);
    console.log(`   To keep: ${plan.templatesToKeep}`);
    console.log(`   To delete: ${plan.templatesToDelete}`);
    console.log(`   Plan created: ${new Date(plan.timestamp).toLocaleString()}\n`);

    if (plan.templatesToDelete === 0) {
      console.log('✅ No templates to delete. Nothing to do!');
      return;
    }

    // Show what will be deleted
    console.log('⚠️  Templates to be DELETED:');
    const deleteGroups = {};
    plan.deleteList.forEach(template => {
      const name = template.taskName || 'Unnamed';
      if (!deleteGroups[name]) {
        deleteGroups[name] = [];
      }
      deleteGroups[name].push(template.id);
    });

    Object.entries(deleteGroups).forEach(([name, ids]) => {
      console.log(`   "${name}": ${ids.length} duplicate(s)`);
    });
    console.log('');

    // NOTE: Firebase Admin SDK would be needed to delete from server-side
    // For now, we'll create an API endpoint to handle deletions
    console.log('⚠️  IMPORTANT: Firebase deletion requires Admin SDK');
    console.log('   Creating deletion API endpoint...\n');

    // Create the API endpoint code
    const apiEndpoint = `import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { DataService } from '@/lib/data-service';

export async function POST(request: NextRequest) {
  try {
    const { templateIds } = await request.json();

    if (!Array.isArray(templateIds)) {
      return NextResponse.json({ error: 'templateIds must be an array' }, { status: 400 });
    }

    console.log(\`🗑️  Deleting \${templateIds.length} templates...\`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const templateId of templateIds) {
      try {
        await adminDb.collection('tasks').doc(templateId).delete();
        console.log(\`   ✅ Deleted: \${templateId}\`);
        successCount++;
      } catch (error) {
        console.error(\`   ❌ Failed to delete \${templateId}:\`, error);
        errors.push({ templateId, error: error.message });
        errorCount++;
      }
    }

    // Clear template cache
    DataService.clearTemplateCache();

    return NextResponse.json({
      success: true,
      deleted: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Delete templates error:', error);
    return NextResponse.json({ error: 'Failed to delete templates' }, { status: 500 });
  }
}`;

    // Save the API endpoint
    const apiPath = path.join(__dirname, '../src/app/api/delete-templates/route.ts');
    const apiDir = path.dirname(apiPath);

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    fs.writeFileSync(apiPath, apiEndpoint);
    console.log(`✅ Created API endpoint: src/app/api/delete-templates/route.ts\n`);

    // Wait for Next.js to compile
    console.log('⏳ Waiting for Next.js to compile new endpoint (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Call the API to delete templates
    console.log('\n🗑️  Deleting templates via API...\n');

    const deleteIds = plan.deleteList.map(t => t.id);
    const response = await fetch('http://localhost:9003/api/delete-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateIds: deleteIds
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API call failed: ${error}`);
    }

    const result = await response.json();

    console.log('=' .repeat(60));
    console.log('✅ CLEANUP COMPLETE!\n');
    console.log(`   Templates deleted: ${result.deleted}`);
    console.log(`   Failed: ${result.failed}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`   ${err.templateId}: ${err.error}`);
      });
    }

    console.log('\n🎯 Next steps:');
    console.log('   1. Template cache has been cleared');
    console.log('   2. Refresh any open pages to see the changes');
    console.log('   3. Verify templates: node scripts/check-duplicate-templates.js\n');

    // Clean up the deletion plan
    fs.unlinkSync(planFile);
    console.log('🧹 Deletion plan file removed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the cleanup
executeCleanup();
