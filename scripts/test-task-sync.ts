/**
 * Script to test task template sync functionality
 *
 * Usage: npx tsx scripts/test-task-sync.ts <taskId>
 */

import { syncTaskWithTemplate } from '../src/lib/task-template-sync';

const taskId = process.argv[2];

if (!taskId) {
  console.error('❌ Error: Please provide a taskId');
  console.error('Usage: npx tsx scripts/test-task-sync.ts <taskId>');
  process.exit(1);
}

async function testSync() {
  console.log(`🔄 Testing sync for task: ${taskId}\n`);

  try {
    const result = await syncTaskWithTemplate(taskId, {
      force: false,
      onLog: (message) => console.log(`   ${message}`)
    });

    console.log('\n📊 Sync Result:');
    console.log(`   Synced: ${result.synced}`);
    console.log(`   Updated Fields: ${result.updatedFields.join(', ') || 'none'}`);

    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }

    if (result.skipped) {
      console.log(`   ⏭️  Skipped: ${result.skipReason}`);
    }

    console.log('\n✅ Test complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSync();
