const completedTaskId = 'uvt9zQYGgm0dmEhYQ0a5'; // Draft custom marketing emails

async function triggerUpdate() {
  console.log('=== TRIGGERING DEPENDENCY UPDATE ===\n');
  console.log('Completed Task ID:', completedTaskId);
  console.log('Task: Draft custom marketing emails');
  console.log('');
  
  const response = await fetch('http://localhost:9002/api/update-task-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      taskId: completedTaskId, 
      status: 'completed' 
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('ERROR:', response.status, errorText);
    return;
  }
  
  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
}

triggerUpdate()
  .then(() => {
    console.log('\nCheck if "Send submission packets" changed to "Needs attention"');
    console.log('Task URL: http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/IuFlbSqoJsRw1HuQMhTA');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
