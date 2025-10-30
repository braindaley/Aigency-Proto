async function triggerRemainingTasks() {
  const tasks = [
    { id: '0KrjIKoos5nw58wT90g7', name: 'Task 6: ACORD 125' },
    { id: 'ytc7c2fkfQaAoGMUNKRR', name: 'Task 7: Write narrative' },
    { id: '85iGeWgKNRbycP3rVVJh', name: 'Task 8: Generate coverage suggestions' },
  ];

  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const workflowId = 'SocSNbV3cXnU5QP1h8sz';

  for (const task of tasks) {
    console.log(`\n🚀 Triggering ${task.name}...`);

    try {
      const response = await fetch('http://localhost:9003/api/ai-task-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          companyId,
          workflowId,
        }),
      });

      const result = await response.json();
      console.log(`   ✅ Completed: ${result.taskCompleted}`);
      console.log(`   📄 Artifacts used: ${result.artifactsUsed}`);

      // Wait before triggering next task
      if (task !== tasks[tasks.length - 1]) {
        console.log('   ⏳ Waiting 10 seconds before next task...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }
  }

  console.log('\n✅ All tasks triggered!');
}

triggerRemainingTasks().catch(console.error);
