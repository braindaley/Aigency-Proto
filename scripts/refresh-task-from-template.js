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

async function refreshTask() {
  const taskId = 'IOnyUqYEMBjXj6BQwbx0';
  
  console.log('=== REFRESHING TASK FROM TEMPLATE ===\n');
  
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('ERROR: Task not found');
    return;
  }
  
  const task = taskDoc.data();
  console.log('Task:', task.taskName);
  console.log('Current Tag:', task.tag);
  console.log('Template ID:', task.templateId);
  
  const templateRef = doc(db, 'tasks', task.templateId);
  const templateDoc = await getDoc(templateRef);
  
  if (!templateDoc.exists()) {
    console.log('ERROR: Template not found');
    return;
  }
  
  const template = templateDoc.data();
  console.log('\nTemplate Tag:', template.tag);
  console.log('Template System Prompt:', template.systemPrompt?.length || 0, 'chars');
  console.log('Template Test Criteria:', template.testCriteria?.length || 0, 'chars');
  
  console.log('\n=== UPDATING TASK ===');
  
  await updateDoc(taskRef, {
    tag: template.tag,
    systemPrompt: template.systemPrompt || null,
    testCriteria: template.testCriteria || null,
    updatedAt: new Date().toISOString()
  });
  
  console.log('\nTask updated successfully!');
  console.log('- Tag:', template.tag);
  console.log('- System Prompt:', template.systemPrompt?.length || 0, 'chars');
  console.log('- Test Criteria:', template.testCriteria?.length || 0, 'chars');
  
  console.log('\nView task at: http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/' + taskId);
}

refreshTask()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
