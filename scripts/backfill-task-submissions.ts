#!/usr/bin/env node
/**
 * Backfill submissions for a completed email task
 * This script creates email submissions from dependency task artifacts
 * for tasks that completed before the submission creation logic was added.
 */

const COMPANY_ID = 'F85kRF3NIwY3mcOwgTnf';
const TASK_ID = 'QWGXPg1O9tW1bQbFc6Wl'; // "Send follow-up emails" task
const TASK_NAME = 'Send follow-up emails';
const DEPENDENCY_TASK_IDS = ['R46yPQ1Ymp7j1hJq9s75']; // The "Identify insurance companies" task

async function backfillSubmissions() {
  try {
    console.log('🔄 Backfilling submissions for task:', TASK_NAME);
    console.log('   Company ID:', COMPANY_ID);
    console.log('   Task ID:', TASK_ID);
    console.log('   Dependency tasks:', DEPENDENCY_TASK_IDS);

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003';
    const response = await fetch(`${baseUrl}/api/submissions/create-from-dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        taskId: TASK_ID,
        taskName: TASK_NAME,
        dependencyTaskIds: DEPENDENCY_TASK_IDS
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to create submissions:', errorData);
      process.exit(1);
    }

    const result = await response.json();
    console.log(`\n✅ Successfully created ${result.count} email submission(s)!`);

    if (result.artifacts && result.artifacts.length > 0) {
      console.log('\n📋 Submissions created for carriers:');
      result.artifacts.forEach((artifact: any, index: number) => {
        console.log(`   ${index + 1}. ${artifact.carrierName}`);
      });
    }

    console.log('\n🎉 Backfill complete! You can now view the emails at:');
    console.log(`   http://localhost:9003/companies/${COMPANY_ID}/tasks/${TASK_ID}`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
}

backfillSubmissions();
