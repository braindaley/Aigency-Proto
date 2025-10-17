const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAllTasks() {
  console.log('=== CHECKING ALL TASKS FOR JSON FORMAT ISSUES ===\n');

  const tasksRef = collection(db, 'companyTasks');
  const snapshot = await getDocs(tasksRef);

  const jsonTasks = [];
  const tasksByTemplate = {};

  snapshot.forEach(doc => {
    const task = doc.data();
    if (task.systemPrompt) {
      const promptLower = task.systemPrompt.toLowerCase();
      
      // Check for JSON indicators
      const hasJson = promptLower.includes('json format') || 
                     promptLower.includes('json output') ||
                     promptLower.includes('return json') ||
                     promptLower.includes('output as json') ||
                     promptLower.includes('```json') ||
                     promptLower.includes('respond with json') ||
                     promptLower.includes('generate json');
      
      if (hasJson) {
        jsonTasks.push({
          id: doc.id,
          taskName: task.taskName,
          companyId: task.companyId,
          status: task.status
        });
        
        // Group by task template name
        const templateName = task.taskName || 'Unknown';
        if (!tasksByTemplate[templateName]) {
          tasksByTemplate[templateName] = [];
        }
        tasksByTemplate[templateName].push(doc.id);
      }
    }
  });

  console.log('Found ' + jsonTasks.length + ' tasks with JSON format in system prompts\n');
  
  console.log('=== TASKS BY TEMPLATE NAME ===\n');
  for (const [templateName, taskIds] of Object.entries(tasksByTemplate)) {
    console.log(templateName + ':');
    console.log('  Count: ' + taskIds.length);
    console.log('  Task IDs: ' + taskIds.slice(0, 3).join(', ') + (taskIds.length > 3 ? '...' : ''));
  }
  
  console.log('\n=== INDIVIDUAL TASKS ===\n');
  jsonTasks.forEach(task => {
    console.log('Task ID: ' + task.id);
    console.log('  Name: ' + task.taskName);
    console.log('  Company: ' + task.companyId);
    console.log('  Status: ' + task.status);
    console.log('---');
  });
}

checkAllTasks()
  .then(() => process.exit(0))
  .catch(console.error);
