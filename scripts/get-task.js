/**
 * Get task details from Firebase by ID
 */

async function getTask(taskId) {
  try {
    console.log(`🔍 Fetching task ${taskId}...\n`);

    const response = await fetch(`http://localhost:9003/api/tasks/${taskId}`);

    if (response.ok) {
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      console.log(`❌ Failed to fetch task: ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Get task ID from command line argument
const taskId = process.argv[2] || '5KIpGSgt481jk1t2pRgP';
getTask(taskId);
