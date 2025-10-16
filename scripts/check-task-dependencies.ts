/**
 * Script to manually check and update task dependencies
 * This is useful when tasks should transition based on completed dependencies
 * but haven't been updated yet.
 */

const COMPANY_ID = process.argv[2] || 'qsu1QXPB8TUK2P4QyDiy';
const TASK_ID = process.argv[3]; // Optional - check specific task
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

async function checkDependencies() {
  console.log(`🔍 Checking task dependencies for company: ${COMPANY_ID}`);
  if (TASK_ID) {
    console.log(`   Specific task: ${TASK_ID}`);
  }
  console.log(`   API URL: ${API_URL}\n`);

  try {
    // Get all tasks for the company
    const tasksResponse = await fetch(`${API_URL}/api/data/tasks?companyId=${COMPANY_ID}`);

    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`);
    }

    const tasks = await tasksResponse.json();
    console.log(`📋 Found ${tasks.length} tasks\n`);

    // Filter for tasks with dependencies that are in "Upcoming" status
    const tasksToCheck = tasks.filter((task: any) =>
      task.status === 'Upcoming' &&
      task.dependencies &&
      task.dependencies.length > 0 &&
      (!TASK_ID || task.id === TASK_ID)
    );

    console.log(`🔄 Found ${tasksToCheck.length} tasks with dependencies in "Upcoming" status\n`);

    for (const task of tasksToCheck) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📌 Task: ${task.taskName}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Template ID: ${task.templateId}`);
      console.log(`   Dependencies: ${JSON.stringify(task.dependencies)}`);

      // Check each dependency
      const depStatuses = [];
      for (const depId of task.dependencies) {
        const depTask = tasks.find((t: any) =>
          t.id === depId ||
          t.templateId === depId ||
          String(t.templateId) === depId
        );

        if (depTask) {
          console.log(`   ✓ Dependency found: ${depTask.taskName}`);
          console.log(`     - ID: ${depTask.id}`);
          console.log(`     - Status: ${depTask.status}`);
          depStatuses.push({
            found: true,
            completed: depTask.status === 'completed',
            name: depTask.taskName
          });
        } else {
          console.log(`   ✗ Dependency NOT FOUND: ${depId}`);
          depStatuses.push({
            found: false,
            completed: false,
            name: depId
          });
        }
      }

      const allCompleted = depStatuses.every(d => d.found && d.completed);

      if (allCompleted) {
        console.log(`\n   ✅ All dependencies are completed!`);
        console.log(`   🔄 This task should be updated to "Needs attention"`);

        // Trigger the update by marking one of the dependencies as completed
        // This will trigger the updateDependentTasks function
        const firstDepTask = tasks.find((t: any) =>
          t.id === task.dependencies[0] ||
          t.templateId === task.dependencies[0]
        );

        if (firstDepTask) {
          console.log(`\n   🚀 Triggering update by re-marking dependency as completed...`);
          const updateResponse = await fetch(`${API_URL}/api/update-task-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: firstDepTask.id,
              status: 'completed'
            })
          });

          if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log(`   ✅ Update triggered successfully`);
          } else {
            console.log(`   ❌ Failed to trigger update: ${updateResponse.status}`);
          }
        }
      } else {
        console.log(`\n   ⏸️  Not all dependencies are completed yet`);
        const incomplete = depStatuses.filter(d => !d.completed);
        console.log(`   Missing: ${incomplete.map(d => d.name).join(', ')}`);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('\n✅ Dependency check completed!');
  } catch (error) {
    console.error('❌ Error checking dependencies:', error);
    process.exit(1);
  }
}

checkDependencies();
