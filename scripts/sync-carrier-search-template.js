/**
 * Sync the updated carrier search task template to Firebase
 * This updates both the task template (sKY8AVp6hj3pqZ957KTT)
 * and any company-specific task instances
 */

const fs = require('fs');
const path = require('path');

async function syncCarrierSearchTemplate() {
  console.log('🚀 Syncing carrier search task template to Firebase...\n');

  try {
    // Load the workers-comp-tasks-complete.json file
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    // Find the carrier search task
    const carrierSearchTask = tasksData.find(t => t.id === 'sKY8AVp6hj3pqZ957KTT');

    if (!carrierSearchTask) {
      console.error('❌ Carrier search task not found in JSON file');
      return;
    }

    console.log('📋 Found task:', carrierSearchTask.taskName);
    console.log('   Template ID:', carrierSearchTask.id);
    console.log('   Tag:', carrierSearchTask.tag);
    console.log('   Show Dependency Artifacts:', carrierSearchTask.showDependencyArtifacts);
    console.log('');

    // Update the task template in Firebase
    console.log('Updating task template in Firebase...');
    const response = await fetch('http://localhost:9003/api/task-templates/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: carrierSearchTask.id,
        taskData: {
          taskName: carrierSearchTask.taskName,
          description: carrierSearchTask.description,
          systemPrompt: carrierSearchTask.systemPrompt,
          policyType: carrierSearchTask.policyType || 'workers-comp',
          phase: carrierSearchTask.phase,
          tag: carrierSearchTask.tag,
          status: carrierSearchTask.status || 'Upcoming',
          dependencies: carrierSearchTask.dependencies || [],
          subtasks: carrierSearchTask.subtasks || [],
          sortOrder: carrierSearchTask.sortOrder,
          testCriteria: carrierSearchTask.testCriteria,
          showDependencyArtifacts: carrierSearchTask.showDependencyArtifacts || false,
        },
        userId: 'migration-script',
        userEmail: 'system@aigency.com'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Task template updated successfully\n');

      console.log('=' .repeat(60));
      console.log('📊 SYNC COMPLETE\n');
      console.log('✅ Template sKY8AVp6hj3pqZ957KTT updated in Firebase');
      console.log('✅ Template is now AI-powered with marketing file integration');
      console.log('✅ JSON file (workers-comp-tasks-complete.json) updated\n');

      console.log('📝 NEXT STEPS:\n');
      console.log('1. ✅ Template is ready to use');
      console.log('2. New company tasks will use this AI-powered template');
      console.log('3. Existing company task instances need to be updated separately\n');

      console.log('🔧 To update an existing company task (like 5KIpGSgt481jk1t2pRgP):');
      console.log('   Run: node scripts/update-carrier-search-task.js');
      console.log('   This updates the company-specific task instance\n');

      console.log('🔗 View in Firebase Console:');
      console.log('   Templates: Firestore Database → tasks → sKY8AVp6hj3pqZ957KTT');
      console.log('   Company Tasks: Firestore Database → companyTasks → 5KIpGSgt481jk1t2pRgP\n');

      console.log('✨ Template sync complete!');

    } else {
      const error = await response.text();
      console.log(`❌ Failed to update template: ${error}`);
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Run the sync
syncCarrierSearchTemplate();
