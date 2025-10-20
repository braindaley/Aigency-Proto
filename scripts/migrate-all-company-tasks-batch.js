/**
 * Batch migration script to update ALL company tasks with system prompts from templates
 * This script fetches all companies and tasks via API and updates them in batches
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:9002';
const BATCH_SIZE = 10; // Process companies in batches to avoid overwhelming the server

// Helper function to delay between operations
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllCompanies() {
  const response = await fetch(`${BASE_URL}/api/data/companies`);
  if (!response.ok) {
    throw new Error('Failed to fetch companies');
  }
  return response.json();
}

async function fetchCompanyTasks(companyId) {
  const response = await fetch(`${BASE_URL}/api/data/tasks?companyId=${companyId}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function updateTask(companyId, taskId, systemPrompt, testCriteria, showDependencyArtifacts) {
  const response = await fetch(`${BASE_URL}/api/update-task-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      companyId,
      systemPrompt,
      testCriteria,
      showDependencyArtifacts
    })
  });

  return response.ok;
}

async function migrateAllCompanyTasks() {
  console.log('🚀 Starting batch migration of all company tasks...\n');

  try {
    // Load template data
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    // Create template map by task name
    const templateMap = {};
    tasksData.forEach(template => {
      templateMap[template.taskName] = template;
    });

    console.log(`📋 Loaded ${Object.keys(templateMap).length} templates\n`);

    // Fetch all companies
    console.log('📂 Fetching all companies...');
    const companies = await fetchAllCompanies();
    console.log(`   Found ${companies.length} companies\n`);

    // Statistics
    let totalCompanies = 0;
    let totalTasks = 0;
    let updatedTasks = 0;
    let skippedTasks = 0;
    let failedTasks = 0;

    // Process companies in batches
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, Math.min(i + BATCH_SIZE, companies.length));
      console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(companies.length/BATCH_SIZE)}`);

      await Promise.all(batch.map(async (company) => {
        totalCompanies++;
        console.log(`\n🏢 Company: ${company.name || company.id}`);

        try {
          // Fetch tasks for this company
          const tasks = await fetchCompanyTasks(company.id);

          if (!tasks || tasks.length === 0) {
            console.log(`   📭 No tasks found`);
            return;
          }

          console.log(`   📋 Found ${tasks.length} tasks`);
          totalTasks += tasks.length;

          // Process each task
          for (const task of tasks) {
            const template = templateMap[task.taskName];

            if (!template) {
              console.log(`   ⚠️ No template for: ${task.taskName.substring(0, 50)}`);
              skippedTasks++;
              continue;
            }

            if (!template.systemPrompt) {
              console.log(`   ⚠️ No system prompt in template: ${task.taskName.substring(0, 50)}`);
              skippedTasks++;
              continue;
            }

            // Check if task already has the correct system prompt
            if (task.systemPrompt === template.systemPrompt) {
              console.log(`   ⏭️ Already up-to-date: ${task.taskName.substring(0, 50)}`);
              skippedTasks++;
              continue;
            }

            // Update the task
            const success = await updateTask(
              company.id,
              task.id,
              template.systemPrompt,
              template.testCriteria || '',
              template.showDependencyArtifacts || false
            );

            if (success) {
              console.log(`   ✅ Updated: ${task.taskName.substring(0, 50)}`);
              updatedTasks++;
            } else {
              console.log(`   ❌ Failed: ${task.taskName.substring(0, 50)}`);
              failedTasks++;
            }

            // Small delay between task updates
            await delay(100);
          }
        } catch (error) {
          console.log(`   ❌ Error processing company: ${error.message}`);
        }
      }));

      // Delay between batches
      if (i + BATCH_SIZE < companies.length) {
        console.log('\n⏳ Waiting before next batch...');
        await delay(2000);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`  🏢 Companies processed: ${totalCompanies}`);
    console.log(`  📋 Total tasks found: ${totalTasks}`);
    console.log(`  ✅ Tasks updated: ${updatedTasks}`);
    console.log(`  ⏭️ Tasks skipped: ${skippedTasks}`);
    console.log(`  ❌ Tasks failed: ${failedTasks}`);

    console.log('\n✨ Migration complete!');

    // Special check for ACORD tasks
    console.log('\n🎯 Checking ACORD tasks...');
    const acordTasks = ['Complete ACORD 130', 'Complete ACORD 125'];

    for (const acordName of acordTasks) {
      const template = Object.values(templateMap).find(t =>
        t.taskName && t.taskName.includes(acordName)
      );

      if (template) {
        console.log(`  ✅ ${acordName}: Has system prompt (${template.systemPrompt?.length || 0} chars)`);
      } else {
        console.log(`  ❌ ${acordName}: Template not found`);
      }
    }

    console.log('\n🔗 Test links:');
    console.log('  ACORD 130: http://localhost:9002/companies/hkDZmFfhLVy7cAqxdfsz/tasks/VL6bva4A1DSCwFVu4q5x');
    console.log('  New Company: http://localhost:9002/companies/new');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  }
}

// Run the migration
console.log('\n🔄 BATCH COMPANY TASK MIGRATION');
console.log('==================================\n');
migrateAllCompanyTasks();