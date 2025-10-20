const fs = require('fs');

// Read the JSON file
const tasks = JSON.parse(fs.readFileSync('workers-comp-tasks-complete.json', 'utf8'));

// Find Task 13
const task13 = tasks.find(t => t.id === 'XajTm0iTsvZX4RIXGmD6');

if (!task13) {
  console.error('Task 13 not found!');
  process.exit(1);
}

// Update the system prompt to add email tone requirements
task13.systemPrompt = task13.systemPrompt.replace(
  /## Email Requirements\n- Professional and courteous tone/,
  `## Email Requirements
- **CRITICAL**: Write as a professional insurance broker emailing an underwriter
- DO NOT include ANY task details, metadata, system information, or internal references
- DO NOT mention "Task 11", "Task 13", "artifacts", "workflow", or similar
- DO NOT include phrases like "based on task details" or "according to the system"
- The email should read as a natural business correspondence from broker to underwriter
- Professional and courteous insurance industry tone`
);

// Also update to reference Task 11 explicitly in the notes
task13.systemPrompt = task13.systemPrompt.replace(
  /- \*\*CRITICAL\*\*: Review the prior task's submissions FIRST/,
  `- **CRITICAL**: Look ONLY at Task 11 "Draft custom marketing emails" artifacts for the carrier list
- Count the exact number of carriers in Task 11 and create ONLY that many follow-up emails
- Review the prior task's marketing emails FIRST`
);

// Write back
fs.writeFileSync('workers-comp-tasks-complete.json', JSON.stringify(tasks, null, 2));

console.log('✅ Task 13 system prompt updated successfully');
console.log('\nUpdated sections:');
console.log('- Added explicit instructions to avoid task/system references in emails');
console.log('- Emphasized broker-to-underwriter professional tone');
console.log('- Clarified to look at Task 11 specifically');
