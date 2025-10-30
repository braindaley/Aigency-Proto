async function triggerComparison() {
  const workflowId = 'swcTQ2gfJkWCnXNy1vQr';

  console.log('🚀 Manually triggering policy comparison...\n');

  const response = await fetch('http://localhost:9003/api/compare-policy/execute-comparison', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Error:', error);
    throw new Error(`API failed: ${response.status}`);
  }

  const result = await response.json();
  console.log('✅ Response:', JSON.stringify(result, null, 2));
}

triggerComparison().catch(console.error);
