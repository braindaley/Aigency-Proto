async function triggerTask5() {
  console.log('🚀 Triggering Task 5 (ACORD 130)...\n');

  const response = await fetch('http://localhost:9003/api/ai-task-completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: '79VTLVr7GgZOVuq1LFng',
      companyId: 'OHioSIzK4i7HwcjLbX5r',
      workflowId: 'SocSNbV3cXnU5QP1h8sz',
    }),
  });

  const result = await response.json();
  console.log('✅ Response:', JSON.stringify(result, null, 2));
}

triggerTask5().catch(console.error);
