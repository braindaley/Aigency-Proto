async function triggerTask() {
  const response = await fetch('http://localhost:9003/api/ai-task-completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: '0KrjIKoos5nw58wT90g7',
      companyId: 'OHioSIzK4i7HwcjLbX5r',
      workflowId: 'SocSNbV3cXnU5QP1h8sz',
    }),
  });

  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
}

triggerTask().catch(console.error);
