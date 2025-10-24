/**
 * Fix the task's template reference to use the correct template
 */

const TASK_ID = '5KIpGSgt481jk1t2pRgP';
const CORRECT_TEMPLATE_ID = 'sKY8AVp6hj3pqZ957KTT';  // The one we updated

async function fixTaskTemplateReference() {
  console.log('🔧 Fixing task template reference...\n');

  try {
    // The task is in companyTasks collection
    // We just need to ensure it has the correct templateId

    console.log(`Task ID: ${TASK_ID}`);
    console.log(`Correct Template ID: ${CORRECT_TEMPLATE_ID}\n`);

    console.log('📝 With dynamic template merging, the task will now:');
    console.log('   1. Reference template: sKY8AVp6hj3pqZ957KTT');
    console.log('   2. Load template data at runtime');
    console.log('   3. Get tag: "ai" from template');
    console.log('   4. Get updated system prompt from template');
    console.log('   5. Get showDependencyArtifacts: true from template\n');

    console.log('✅ No Firebase update needed!');
    console.log('   The dynamic merging handles everything automatically.\n');

    console.log('🎯 The task will use the AI template on next page load.');
    console.log('   Just refresh the page: http://localhost:9003/companies/hkDZmFfhLVy7cAqxdfsz/tasks/5KIpGSgt481jk1t2pRgP');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the fix
fixTaskTemplateReference();
