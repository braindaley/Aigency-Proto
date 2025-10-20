/**
 * Update all existing company tasks with system prompts from templates
 * This script connects directly to Firebase to update tasks
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'aigency-proto'
});

const db = admin.firestore();

async function updateAllCompanyTasks() {
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

    // Get all companies
    const companiesSnapshot = await db.collection('companies').get();
    console.log(`📂 Found ${companiesSnapshot.size} companies\n`);

    let totalTasks = 0;
    let updatedTasks = 0;
    let skippedTasks = 0;

    // Process each company
    for (const companyDoc of companiesSnapshot.docs) {
      const companyData = companyDoc.data();
      console.log(`\n🏢 Processing: ${companyData.name || companyDoc.id}`);

      // Get all tasks for this company
      const tasksSnapshot = await db
        .collection('companies')
        .doc(companyDoc.id)
        .collection('companyTasks')
        .get();

      if (tasksSnapshot.empty) {
        console.log(`  📭 No tasks found`);
        continue;
      }

      console.log(`  📋 Found ${tasksSnapshot.size} tasks`);

      // Update each task
      for (const taskDoc of tasksSnapshot.docs) {
        const taskData = taskDoc.data();
        totalTasks++;

        // Find the corresponding template
        const template = templateMap[taskData.taskName];

        if (template && template.systemPrompt) {
          // Check if task already has the same system prompt
          if (taskData.systemPrompt === template.systemPrompt) {
            console.log(`    ⏭️ Skipped (already has prompt): ${taskData.taskName.substring(0, 40)}`);
            skippedTasks++;
            continue;
          }

          // Update the task with system prompt and test criteria
          try {
            await db
              .collection('companies')
              .doc(companyDoc.id)
              .collection('companyTasks')
              .doc(taskDoc.id)
              .update({
                systemPrompt: template.systemPrompt,
                testCriteria: template.testCriteria || taskData.testCriteria || '',
                showDependencyArtifacts: template.showDependencyArtifacts || false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

            console.log(`    ✅ Updated: ${taskData.taskName.substring(0, 40)}`);
            updatedTasks++;
          } catch (error) {
            console.log(`    ❌ Failed: ${taskData.taskName.substring(0, 40)} - ${error.message}`);
          }
        } else if (!template) {
          console.log(`    ⚠️ No template found for: ${taskData.taskName.substring(0, 40)}`);
        } else {
          console.log(`    ⚠️ Template has no system prompt: ${taskData.taskName.substring(0, 40)}`);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY:');
    console.log(`  📋 Total tasks found: ${totalTasks}`);
    console.log(`  ✅ Updated: ${updatedTasks}`);
    console.log(`  ⏭️ Skipped (already up-to-date): ${skippedTasks}`);
    console.log(`  ⚠️ No template/prompt: ${totalTasks - updatedTasks - skippedTasks}`);

    // Special focus on ACORD 130
    console.log('\n🎯 ACORD 130 Task Check:');
    const acord130Tasks = await db
      .collectionGroup('companyTasks')
      .where('taskName', '==', "Complete ACORD 130 - Workers' Compensation Application")
      .get();

    console.log(`  Found ${acord130Tasks.size} ACORD 130 tasks`);
    acord130Tasks.forEach(doc => {
      const data = doc.data();
      const hasPrompt = !!data.systemPrompt;
      const promptLength = data.systemPrompt?.length || 0;
      console.log(`    ${hasPrompt ? '✅' : '❌'} Company task ${doc.id}: ${hasPrompt ? `has prompt (${promptLength} chars)` : 'NO PROMPT'}`);
    });

    console.log('\n✨ Update complete!');
    console.log('\n🔗 Test the ACORD 130 task:');
    console.log('  http://localhost:9002/companies/hkDZmFfhLVy7cAqxdfsz/tasks/VL6bva4A1DSCwFVu4q5x');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  // Clean up
  await admin.app().delete();
}

// Run the update
updateAllCompanyTasks();