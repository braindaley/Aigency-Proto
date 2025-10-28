/**
 * Trigger the follow-up emails task
 */

async function triggerFollowUpTask() {
  const taskId = 'GwnjdfTi1JOPGBcpPWot';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('🚀 Triggering follow-up emails task with AI...\n');

  try {
    const response = await fetch('http://localhost:9003/api/ai-task-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        companyId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error);
      return;
    }

    const result = await response.json();
    console.log('✅ Task triggered successfully!\n');

    if (result.aiResponse) {
      // Count artifacts in response
      const artifactMatches = result.aiResponse.match(/<artifact[^>]*>/g);
      const artifactCount = artifactMatches ? artifactMatches.length : 0;

      console.log(`📧 Generated ${artifactCount} follow-up email artifacts`);
    }

    console.log('\n📝 The task is now running in the background.');
    console.log('You can monitor progress at:');
    console.log(`http://localhost:9003/companies/${companyId}/tasks/${taskId}`);
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

triggerFollowUpTask();
