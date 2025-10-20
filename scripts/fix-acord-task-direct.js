// Direct update of the ACORD 130 company task instance
const fs = require('fs');
const path = require('path');

async function fixACORDTask() {
  console.log('🔧 Fixing ACORD 130 task directly...\n');

  try {
    // Load the workers-comp-tasks-complete.json file to get the system prompt
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    // Find the ACORD 130 task template
    const acord130Template = tasksData.find(task =>
      task.taskName === "Complete ACORD 130 - Workers' Compensation Application"
    );

    if (!acord130Template) {
      console.error('❌ ACORD 130 template not found');
      return;
    }

    console.log('📋 Found ACORD 130 template');
    console.log('   System Prompt Length:', acord130Template.systemPrompt?.length || 0);

    // Update the specific company task instance
    const COMPANY_ID = 'hkDZmFfhLVy7cAqxdfsz';
    const TASK_ID = 'VL6bva4A1DSCwFVu4q5x';

    // First, update the company task with the system prompt
    console.log('\n1️⃣ Updating company task instance with system prompt...');
    const updateResponse = await fetch('http://localhost:9002/api/update-task-prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: TASK_ID,  // This is the company task instance ID
        systemPrompt: acord130Template.systemPrompt
      })
    });

    if (updateResponse.ok) {
      console.log('✅ Company task updated with system prompt!');
    } else {
      console.log('⚠️ Could not update company task (might not exist yet)');
    }

    // Now trigger the AI completion
    console.log('\n2️⃣ Triggering AI task completion...');
    const completionResponse = await fetch('http://localhost:9002/api/ai-task-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: TASK_ID,
        companyId: COMPANY_ID
      })
    });

    if (completionResponse.ok) {
      const result = await completionResponse.json();
      console.log('✅ AI task completion triggered!');

      // Check if the response looks correct
      if (result.aiResponse && result.aiResponse.includes('json')) {
        console.log('\n⚠️ WARNING: AI generated JSON instead of markdown');
        console.log('   This suggests the system prompt might not be working correctly');
      } else if (result.artifactId) {
        console.log(`\n📄 Artifact created: ${result.artifactId}`);
      }

      if (result.taskCompleted) {
        console.log('✅ Task marked as completed!');
      }

      console.log(`\n🔗 View the task: http://localhost:9002/companies/${COMPANY_ID}/tasks/${TASK_ID}`);
    } else {
      console.error('❌ Failed to trigger AI completion:', completionResponse.status);
      const errorText = await completionResponse.text();
      console.error('   Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run it
fixACORDTask();