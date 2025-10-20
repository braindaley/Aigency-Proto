// Simple script to trigger ACORD 130 task completion

async function triggerACORD130Completion() {
  const COMPANY_ID = 'hkDZmFfhLVy7cAqxdfsz';
  const TASK_ID = 'VL6bva4A1DSCwFVu4q5x';

  console.log('🚀 Triggering ACORD 130 AI task completion...');

  try {
    const response = await fetch('http://localhost:9002/api/ai-task-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: TASK_ID,
        companyId: COMPANY_ID
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ AI task completion triggered successfully!');
      console.log('\n📋 Response:', JSON.stringify(result, null, 2));

      if (result.artifactId) {
        console.log(`\n📄 Artifact created with ID: ${result.artifactId}`);
        console.log(`🔗 View task: http://localhost:9002/companies/${COMPANY_ID}/tasks/${TASK_ID}`);
      }

      if (result.error) {
        console.error('⚠️ Error in response:', result.error);
      }
    } else {
      console.error('❌ Failed to trigger AI task completion:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }
}

// Run it
triggerACORD130Completion();