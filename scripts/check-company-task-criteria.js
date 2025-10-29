const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

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

async function checkCompanyTaskCriteria() {
  const companyTaskId = 'GwnjdfTi1JOPGBcpPWot'; // Draft follow-up emails company task

  console.log('=== COMPANY TASK TEST CRITERIA ===\n');

  const taskRef = doc(db, 'companyTasks', companyTaskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    console.log('❌ Task not found');
    return;
  }

  const taskData = taskSnap.data();
  console.log('📋 Company Task:', taskData.taskName);
  console.log('   Task ID:', companyTaskId);
  console.log('   Template ID:', taskData.templateId);
  console.log('   Status:', taskData.status);
  console.log('   Phase:', taskData.phase);
  console.log('');

  console.log('=== COMPANY TASK TEST CRITERIA OVERRIDE ===\n');
  if (taskData.testCriteria && Array.isArray(taskData.testCriteria) && taskData.testCriteria.length > 0) {
    console.log('⚠️  This company task has CUSTOM test criteria (overriding template):');
    taskData.testCriteria.forEach((criteria, index) => {
      console.log(`${index + 1}. ${criteria}`);
    });
    console.log('\nℹ️  These custom criteria might be outdated. Should we clear them to use template criteria instead?');
  } else {
    console.log('✅ No custom criteria override - will use template criteria');
  }

  // Also check the template
  if (taskData.templateId) {
    console.log('\n=== TEMPLATE TEST CRITERIA ===\n');
    const templateRef = doc(db, 'tasks', taskData.templateId);
    const templateSnap = await getDoc(templateRef);

    if (templateSnap.exists()) {
      const templateData = templateSnap.data();
      if (templateData.testCriteria && Array.isArray(templateData.testCriteria)) {
        templateData.testCriteria.forEach((criteria, index) => {
          console.log(`${index + 1}. ${criteria}`);
        });
      } else {
        console.log('No template test criteria found');
      }
    }
  }

  // Offer to clear custom criteria if they exist
  if (taskData.testCriteria && Array.isArray(taskData.testCriteria) && taskData.testCriteria.length > 0) {
    console.log('\n=== RECOMMENDATION ===');
    console.log('The company task has custom test criteria. To use the updated template criteria,');
    console.log('run: node scripts/clear-company-task-criteria.js');
  }
}

checkCompanyTaskCriteria().catch(console.error);
