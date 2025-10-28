/**
 * Trigger the marketing email task to run with AI
 */

async function triggerMarketingTask() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('🚀 Triggering marketing email task with AI...\n');

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
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n📝 The task is now running in the background.');
    console.log('You can monitor progress at:');
    console.log(`http://localhost:9003/companies/${companyId}/tasks/${taskId}`);
    console.log('\nOnce complete, check the emails page:');
    console.log(`http://localhost:9003/companies/${companyId}/emails`);
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

triggerMarketingTask();
