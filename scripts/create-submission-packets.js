/**
 * Create email submissions for the "Send submission packets" task
 */

async function createSubmissionPackets() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba'; // Send submission packets task
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const marketingEmailsTaskId = 'jNhpC2VMnQwQPQYJgSeX'; // Dependency

  console.log('🚀 Creating submission packets from marketing emails...\n');

  try {
    const response = await fetch('http://localhost:9003/api/submissions/create-from-dependencies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        taskId,
        taskName: 'Send submission packets',
        dependencyTaskIds: [marketingEmailsTaskId]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', JSON.stringify(error, null, 2));
      return;
    }

    const result = await response.json();
    console.log('✅ Submission packets created successfully!\n');
    console.log(`📧 Created ${result.count} submission packets`);
    console.log(`📎 Each includes ${result.artifacts[0]?.attachments || 'multiple'} attachments`);

    console.log('\nCarriers:');
    result.artifacts.forEach((art, idx) => {
      console.log(`  ${idx + 1}. ${art.carrierName}`);
    });

    console.log('\nView at:');
    console.log(`http://localhost:9003/companies/${companyId}/tasks/${taskId}`);
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

createSubmissionPackets();
