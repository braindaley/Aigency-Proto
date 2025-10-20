// Update ACORD 130 task template in Firestore with correct system prompt
const fs = require('fs');
const path = require('path');

async function updateACORD130Template() {
  console.log('🔄 Updating ACORD 130 task template in Firestore...\n');

  try {
    // Load the workers-comp-tasks-complete.json file
    const tasksData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../workers-comp-tasks-complete.json'), 'utf8')
    );

    // Find the ACORD 130 task
    const acord130Task = tasksData.find(task =>
      task.taskName === "Complete ACORD 130 - Workers' Compensation Application"
    );

    if (!acord130Task) {
      console.error('❌ ACORD 130 task not found in workers-comp-tasks-complete.json');
      return;
    }

    console.log('📋 Found ACORD 130 task template');
    console.log(`   Task ID: ${acord130Task.id}`);
    console.log(`   System Prompt Length: ${acord130Task.systemPrompt?.length || 0} characters`);

    // Update the task template in Firestore using the API
    const response = await fetch('http://localhost:9002/api/update-task-prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: acord130Task.id,
        systemPrompt: acord130Task.systemPrompt,
        policyType: 'workers-comp'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ ACORD 130 task template updated successfully!');
      console.log('   Response:', result.message || 'Task updated');
    } else {
      console.error('❌ Failed to update task template:', response.status);
      const errorText = await response.text();
      console.error('   Error:', errorText);
    }

    // Also trigger the AI completion for the specific company task
    console.log('\n🚀 Now triggering AI completion for the company task...');

    const COMPANY_ID = 'hkDZmFfhLVy7cAqxdfsz';
    const TASK_ID = 'VL6bva4A1DSCwFVu4q5x';

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
      const completionResult = await completionResponse.json();
      console.log('✅ AI task completion triggered!');

      if (completionResult.artifactId) {
        console.log(`📄 Artifact created: ${completionResult.artifactId}`);
      }

      if (completionResult.taskCompleted) {
        console.log('✅ Task marked as completed!');
      }

      console.log(`\n🔗 View the task: http://localhost:9002/companies/${COMPANY_ID}/tasks/${TASK_ID}`);
    } else {
      console.error('❌ Failed to trigger AI completion:', completionResponse.status);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run it
updateACORD130Template();