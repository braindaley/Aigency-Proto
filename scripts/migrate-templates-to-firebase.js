/**
 * Migrate task templates from local JSON file to Firebase
 * This ensures all templates have proper system prompts in the database
 */

const fs = require('fs');
const path = require('path');

async function migrateTemplatesToFirebase() {
  console.log('🚀 Migrating task templates to Firebase...\n');

  try {
    // Load the workers-comp-tasks-complete.json file
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    console.log(`📋 Found ${tasksData.length} task templates to migrate\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each task template
    for (const task of tasksData) {
      try {
        console.log(`Processing: ${task.taskName}`);

        // Call the API to update/create the task template
        const response = await fetch('http://localhost:9002/api/task-templates/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: task.id,
            taskData: {
              taskName: task.taskName,
              description: task.description,
              systemPrompt: task.systemPrompt,
              policyType: task.policyType || 'workers-comp',
              phase: task.phase,
              tag: task.tag,
              status: task.status || 'Upcoming',
              dependencies: task.dependencies || [],
              subtasks: task.subtasks || [],
              sortOrder: task.sortOrder,
              testCriteria: task.testCriteria,
              showDependencyArtifacts: task.showDependencyArtifacts || false,
              updatedAt: new Date().toISOString()
            }
          })
        });

        if (response.ok) {
          console.log(`  ✅ Success`);
          successCount++;
        } else {
          const error = await response.text();
          console.log(`  ❌ Failed: ${error}`);
          errors.push({ task: task.taskName, error });
          errorCount++;
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors.push({ task: task.taskName, error: error.message });
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`  ✅ Successful: ${successCount}/${tasksData.length}`);
    console.log(`  ❌ Failed: ${errorCount}/${tasksData.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.task}: ${e.error}`);
      });
    }

    // Next steps
    console.log('\n📝 Next Steps:');
    console.log('1. Create the /api/task-templates/upsert endpoint if it doesn\'t exist');
    console.log('2. Update all API endpoints to read from Firebase instead of JSON file');
    console.log('3. Remove localStorage fallbacks from components');
    console.log('4. Test task creation and AI completion flows');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run the migration
migrateTemplatesToFirebase();