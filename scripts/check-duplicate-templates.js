/**
 * Check for duplicate task templates in Firebase
 */

async function checkDuplicateTemplates() {
  console.log('🔍 Checking for duplicate task templates...\n');

  try {
    // Fetch all templates from the tasks collection
    const response = await fetch('http://localhost:9003/api/data/tasks');

    if (!response.ok) {
      console.error('❌ Failed to fetch tasks');
      return;
    }

    const tasks = await response.json();
    console.log(`📋 Total templates found: ${tasks.length}\n`);

    // Group by task name to find duplicates
    const tasksByName = {};
    tasks.forEach(task => {
      const name = task.taskName || 'Unnamed';
      if (!tasksByName[name]) {
        tasksByName[name] = [];
      }
      tasksByName[name].push(task);
    });

    // Find duplicates
    const duplicates = Object.entries(tasksByName).filter(([name, tasks]) => tasks.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate task names found!');
      return;
    }

    console.log(`⚠️ Found ${duplicates.length} duplicate task name(s):\n`);

    duplicates.forEach(([name, tasks]) => {
      console.log(`📌 "${name}" (${tasks.length} instances):`);
      tasks.forEach(task => {
        console.log(`   - ID: ${task.id}`);
        console.log(`     Tag: ${task.tag || 'none'}`);
        console.log(`     Phase: ${task.phase || 'none'}`);
        console.log(`     Sort Order: ${task.sortOrder || 'none'}`);
        console.log(`     Has System Prompt: ${task.systemPrompt ? 'Yes' : 'No'}`);
        console.log(`     System Prompt Length: ${task.systemPrompt?.length || 0} chars`);
        console.log('');
      });
    });

    // Check specifically for carrier search tasks
    const carrierTasks = tasks.filter(t =>
      t.taskName?.toLowerCase().includes('carrier') ||
      t.taskName?.toLowerCase().includes('suitable')
    );

    console.log('\n📊 Carrier-related tasks:');
    carrierTasks.forEach(task => {
      console.log(`\n${task.taskName}`);
      console.log(`  ID: ${task.id}`);
      console.log(`  Tag: ${task.tag}`);
      console.log(`  Phase: ${task.phase}`);
      console.log(`  Sort Order: ${task.sortOrder}`);
      console.log(`  Show Dependency Artifacts: ${task.showDependencyArtifacts || false}`);
      console.log(`  System Prompt: ${task.systemPrompt ? task.systemPrompt.substring(0, 100) + '...' : 'None'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkDuplicateTemplates();
