/**
 * Update all company tasks with system prompts via API
 * Uses the existing API endpoints instead of direct Firebase access
 */

const fs = require('fs');
const path = require('path');

async function updateCompanyTasksViaAPI() {
  console.log('🔄 Updating all company tasks with system prompts from templates\n');

  try {
    // Load the local templates for reference
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    // Create a map of templates by taskName
    const templateMap = {};
    tasksData.forEach(template => {
      templateMap[template.taskName] = template;
    });

    console.log(`📋 Loaded ${Object.keys(templateMap).length} templates\n`);

    // For now, let's focus on updating the known ACORD 130 task
    const knownTasks = [
      {
        companyId: 'hkDZmFfhLVy7cAqxdfsz',
        taskId: 'VL6bva4A1DSCwFVu4q5x',
        taskName: "Complete ACORD 130 - Workers' Compensation Application"
      },
      // Add more known tasks here as needed
    ];

    console.log(`🎯 Updating ${knownTasks.length} known company tasks\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const task of knownTasks) {
      const template = templateMap[task.taskName];

      if (!template) {
        console.log(`❌ No template found for: ${task.taskName}`);
        errorCount++;
        continue;
      }

      if (!template.systemPrompt) {
        console.log(`⚠️ Template has no system prompt: ${task.taskName}`);
        errorCount++;
        continue;
      }

      console.log(`\n📝 Updating: ${task.taskName}`);
      console.log(`   Company: ${task.companyId}`);
      console.log(`   Task ID: ${task.taskId}`);
      console.log(`   System Prompt Length: ${template.systemPrompt.length} chars`);

      try {
        // Update the task with the system prompt
        const response = await fetch('http://localhost:9002/api/update-task-prompts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.taskId,
            companyId: task.companyId,
            systemPrompt: template.systemPrompt,
            testCriteria: template.testCriteria || '',
            showDependencyArtifacts: template.showDependencyArtifacts || false
          })
        });

        if (response.ok) {
          console.log('   ✅ Task updated successfully!');
          successCount++;

          // Now trigger AI completion for this task
          console.log('   🤖 Triggering AI completion...');
          const completionResponse = await fetch('http://localhost:9002/api/ai-task-completion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: task.taskId,
              companyId: task.companyId
            })
          });

          if (completionResponse.ok) {
            const result = await completionResponse.json();
            console.log('   ✅ AI completion triggered!');

            if (result.artifactId) {
              console.log(`   📄 Artifact created: ${result.artifactId}`);
            }

            // Check if it generated markdown instead of JSON
            if (result.aiResponse && !result.aiResponse.includes('"taskName"')) {
              console.log('   ✅ Generated MARKDOWN format (correct!)');
            } else if (result.aiResponse && result.aiResponse.includes('"taskName"')) {
              console.log('   ❌ Still generating JSON format (incorrect)');
            }
          } else {
            console.log('   ⚠️ AI completion failed:', completionResponse.status);
          }
        } else {
          console.log('   ❌ Failed to update task:', response.status);
          const errorText = await response.text();
          console.log('   Error:', errorText);
          errorCount++;
        }
      } catch (error) {
        console.log('   ❌ Error:', error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY:');
    console.log(`  ✅ Successfully updated: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);

    console.log('\n✨ Update complete!');
    console.log('\n🔗 Test the ACORD 130 task:');
    console.log('  http://localhost:9002/companies/hkDZmFfhLVy7cAqxdfsz/tasks/VL6bva4A1DSCwFVu4q5x');

    console.log('\n📝 Next steps:');
    console.log('1. Check if the ACORD 130 now generates markdown instead of JSON');
    console.log('2. If successful, we can expand this script to update all tasks');
    console.log('3. Consider implementing a batch update endpoint');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the update
updateCompanyTasksViaAPI();