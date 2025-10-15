const fs = require('fs');
const path = require('path');

// Read the workers comp tasks JSON
const jsonPath = path.join(__dirname, '..', 'workers-comp-tasks-complete.json');
const tasksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Read the new system prompts
const acord130Prompt = fs.readFileSync(path.join(__dirname, '..', 'acord-130-system-prompt.txt'), 'utf8');
const acord125Prompt = fs.readFileSync(path.join(__dirname, '..', 'acord-125-system-prompt.txt'), 'utf8');

console.log('📄 Loaded new system prompts:');
console.log(`  - ACORD 130: ${acord130Prompt.length} characters`);
console.log(`  - ACORD 125: ${acord125Prompt.length} characters`);
console.log('');

let updatedCount = 0;

// Update tasks
tasksData.forEach(task => {
  // Update ACORD 130 task
  if (task.taskName === 'Complete ACORD 130 - Workers\' Compensation Application') {
    task.systemPrompt = acord130Prompt;
    console.log('✅ Updated:', task.taskName);
    console.log(`   Task ID: ${task.id}`);
    updatedCount++;
  }

  // Update ACORD 125 task
  if (task.taskName === 'Complete ACORD 125 – Commercial Insurance Application') {
    task.systemPrompt = acord125Prompt;
    console.log('✅ Updated:', task.taskName);
    console.log(`   Task ID: ${task.id}`);
    updatedCount++;
  }
});

// Write updated JSON back to file
fs.writeFileSync(jsonPath, JSON.stringify(tasksData, null, 2));

console.log('');
console.log(`✅ Successfully updated ${updatedCount} tasks in workers-comp-tasks-complete.json`);
console.log('');
console.log('📝 Next steps:');
console.log('  1. These templates are now in the JSON file');
console.log('  2. New companies created will automatically use these templates');
console.log('  3. For existing companies, you may need to regenerate tasks or update them individually');

process.exit(0);
