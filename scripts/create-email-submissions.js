/**
 * Manually trigger submission creation from the marketing email task artifacts
 */

async function createEmailSubmissions() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX'; // Marketing email task
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('🚀 Creating email submissions from marketing task artifacts...\n');

  try {
    const response = await fetch('http://localhost:9003/api/submissions/create-from-dependencies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        taskId,
        taskName: 'Draft custom marketing emails',
        dependencyTaskIds: [taskId] // Use the task itself since it has the email artifacts
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', JSON.stringify(error, null, 2));
      return;
    }

    const result = await response.json();
    console.log('✅ Submissions created successfully!\n');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`\n📧 Created ${result.count} email submissions`);
    console.log(`📎 With ${result.artifacts.length} carrier-specific emails`);
    console.log('\nView emails at:');
    console.log(`http://localhost:9003/companies/${companyId}/emails`);
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

createEmailSubmissions();
