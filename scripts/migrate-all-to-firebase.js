/**
 * Complete migration of templates and company tasks to Firebase
 * This ensures all templates and existing tasks have proper system prompts
 */

const fs = require('fs');
const path = require('path');

async function migrateEverythingToFirebase() {
  console.log('🚀 Starting complete migration to Firebase...\n');
  console.log('This will migrate:');
  console.log('  1. All task templates from workers-comp-tasks-complete.json');
  console.log('  2. All existing company tasks to ensure they have system prompts\n');

  try {
    // Load the workers-comp-tasks-complete.json file
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    console.log(`📋 Found ${tasksData.length} task templates to migrate\n`);
    console.log('=' + '='.repeat(60) + '\n');

    // PHASE 1: Migrate all templates
    console.log('PHASE 1: MIGRATING TASK TEMPLATES\n');
    console.log('-'.repeat(60));

    let templateSuccess = 0;
    let templateError = 0;
    const templateErrors = [];

    for (let i = 0; i < tasksData.length; i++) {
      const task = tasksData[i];
      const progress = `[${i + 1}/${tasksData.length}]`;

      try {
        process.stdout.write(`${progress} ${task.taskName.substring(0, 40)}...`);

        // Call the API to create/update the task template
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
              systemPrompt: task.systemPrompt || '',
              testCriteria: task.testCriteria || '',
              policyType: task.policyType || 'workers-comp',
              phase: task.phase,
              tag: task.tag,
              status: task.status || 'Upcoming',
              dependencies: task.dependencies || [],
              subtasks: task.subtasks || [],
              sortOrder: task.sortOrder || 0,
              showDependencyArtifacts: task.showDependencyArtifacts || false,
            }
          })
        });

        if (response.ok) {
          process.stdout.write(' ✅\n');
          templateSuccess++;
        } else {
          const error = await response.text();
          process.stdout.write(' ❌\n');
          console.log(`    Error: ${error}`);
          templateErrors.push({ task: task.taskName, error });
          templateError++;
        }

      } catch (error) {
        process.stdout.write(' ❌\n');
        console.log(`    Error: ${error.message}`);
        templateErrors.push({ task: task.taskName, error: error.message });
        templateError++;
      }
    }

    // Template migration summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEMPLATE MIGRATION SUMMARY:');
    console.log(`  ✅ Successful: ${templateSuccess}/${tasksData.length}`);
    console.log(`  ❌ Failed: ${templateError}/${tasksData.length}`);

    if (templateErrors.length > 0) {
      console.log('\n❌ Template Migration Errors:');
      templateErrors.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.task.substring(0, 50)}: ${e.error}`);
      });
    }

    // PHASE 2: Update all existing company tasks
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('PHASE 2: UPDATING EXISTING COMPANY TASKS\n');
    console.log('-'.repeat(60));
    console.log('\nFetching all companies and their tasks...\n');

    // Get all companies
    const companiesResponse = await fetch('http://localhost:9002/api/companies');
    if (!companiesResponse.ok) {
      console.error('❌ Failed to fetch companies');
      return;
    }

    const companies = await companiesResponse.json();
    console.log(`📂 Found ${companies.length} companies\n`);

    let companyTaskSuccess = 0;
    let companyTaskError = 0;
    let totalCompanyTasks = 0;

    // Create a map of templates by taskName for quick lookup
    const templateMap = {};
    tasksData.forEach(template => {
      templateMap[template.taskName] = template;
    });

    // Process each company
    for (const company of companies) {
      console.log(`\nProcessing company: ${company.name || company.id}`);

      // Get tasks for this company
      const tasksResponse = await fetch(`http://localhost:9002/api/companies/${company.id}/tasks`);
      if (!tasksResponse.ok) {
        console.log(`  ⚠️ Could not fetch tasks for company ${company.id}`);
        continue;
      }

      const companyTasks = await tasksResponse.json();
      if (!companyTasks || companyTasks.length === 0) {
        console.log(`  📭 No tasks found`);
        continue;
      }

      console.log(`  📋 Found ${companyTasks.length} tasks`);
      totalCompanyTasks += companyTasks.length;

      // Update each company task with the system prompt from template
      for (const task of companyTasks) {
        const template = templateMap[task.taskName];

        if (template && template.systemPrompt) {
          try {
            // Update the company task with the system prompt from template
            const updateResponse = await fetch('http://localhost:9002/api/update-task-prompts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                taskId: task.id,
                systemPrompt: template.systemPrompt,
                testCriteria: template.testCriteria || task.testCriteria,
              })
            });

            if (updateResponse.ok) {
              process.stdout.write('    ✅ ');
              console.log(`Updated: ${task.taskName.substring(0, 40)}`);
              companyTaskSuccess++;
            } else {
              process.stdout.write('    ❌ ');
              console.log(`Failed: ${task.taskName.substring(0, 40)}`);
              companyTaskError++;
            }
          } catch (error) {
            process.stdout.write('    ❌ ');
            console.log(`Error: ${task.taskName.substring(0, 40)}: ${error.message}`);
            companyTaskError++;
          }
        } else if (!template) {
          console.log(`    ⚠️ No template found for: ${task.taskName.substring(0, 40)}`);
        }
      }
    }

    // Company task update summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPANY TASKS UPDATE SUMMARY:');
    console.log(`  📋 Total company tasks found: ${totalCompanyTasks}`);
    console.log(`  ✅ Successfully updated: ${companyTaskSuccess}`);
    console.log(`  ❌ Failed to update: ${companyTaskError}`);
    console.log(`  ⏭️ Skipped (no template): ${totalCompanyTasks - companyTaskSuccess - companyTaskError}`);

    // FINAL SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!\n');
    console.log('✅ What was done:');
    console.log(`  • ${templateSuccess} task templates migrated to Firebase`);
    console.log(`  • ${companyTaskSuccess} company tasks updated with system prompts`);

    console.log('\n📝 Next Steps:');
    console.log('1. Verify tasks generate markdown instead of JSON');
    console.log('2. Remove localStorage fallbacks from components');
    console.log('3. Update all API endpoints to read from Firebase only');
    console.log('4. Consider removing workers-comp-tasks-complete.json file');

    console.log('\n🔗 Test Links:');
    console.log('  ACORD 130: http://localhost:9002/companies/hkDZmFfhLVy7cAqxdfsz/tasks/VL6bva4A1DSCwFVu4q5x');
    console.log('  New Company: http://localhost:9002/companies/new');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  }
}

// Run the complete migration
console.log('\n🔄 COMPLETE FIREBASE MIGRATION TOOL');
console.log('=====================================\n');
migrateEverythingToFirebase();