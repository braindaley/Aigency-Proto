const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function checkTaskDependencies() {
  const taskId = 'GwnjdfTi1JOPGBcpPWot'; // Draft follow-up emails
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('=== CHECKING TASK DEPENDENCIES ===\n');

  const taskRef = doc(db, 'companyTasks', taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    console.log('❌ Task not found');
    return;
  }

  const taskData = taskSnap.data();
  console.log('📋 Task:', taskData.taskName);
  console.log('   Status:', taskData.status);
  console.log('   Phase:', taskData.phase);
  console.log('   Sort Order:', taskData.sortOrder);
  console.log('   Template ID:', taskData.templateId);
  console.log('   Dependencies:', JSON.stringify(taskData.dependencies || []));
  console.log('');

  // Check if dependencies exist
  if (taskData.dependencies && taskData.dependencies.length > 0) {
    console.log('=== DEPENDENCY DETAILS ===\n');

    for (const depTemplateId of taskData.dependencies) {
      console.log(`Checking dependency template: ${depTemplateId}`);

      // Get the template to see what it is
      const templateRef = doc(db, 'tasks', depTemplateId);
      const templateSnap = await getDoc(templateRef);

      if (templateSnap.exists()) {
        const templateData = templateSnap.data();
        console.log(`  Template name: ${templateData.taskName}`);
        console.log(`  Template sort order: ${templateData.sortOrder}`);
      }
      console.log('');
    }
  }

  console.log('=== RECOMMENDATION ===\n');
  console.log('The task has status "available" which is not a standard TaskStatus.');
  console.log('It should be changed to one of:');
  console.log('  - "Needs attention" (if ready to work on)');
  console.log('  - "Upcoming" (if waiting on dependencies)');
  console.log('  - "completed" (if already done)');
}

checkTaskDependencies().catch(console.error);
