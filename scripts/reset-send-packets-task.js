const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, getDocs, deleteDoc } = require('firebase/firestore');

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

async function resetTask() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const taskId = 'IuFlbSqoJsRw1HuQMhTA';
  const templateId = 'xSlP5LJa24ZxHpX8q4pi';
  
  console.log('=== RESETTING SEND SUBMISSION PACKETS TASK ===\n');
  
  // Get template
  const templateRef = doc(db, 'tasks', templateId);
  const templateDoc = await getDoc(templateRef);
  
  if (!templateDoc.exists()) {
    console.log('ERROR: Template not found');
    return;
  }
  
  const template = templateDoc.data();
  
  // Update task with new template data
  const taskRef = doc(db, 'companyTasks', taskId);
  await updateDoc(taskRef, {
    status: 'Needs attention',
    completedAt: null,
    completedBy: null,
    systemPrompt: template.systemPrompt,
    testCriteria: template.testCriteria,
    tag: template.tag,
    updatedAt: new Date().toISOString()
  });
  
  console.log('Task reset to "Needs attention"');
  
  // Delete old artifact
  console.log('\nDeleting old artifact...');
  const artifactsRef = collection(db, 'companies', companyId, 'artifacts');
  const artifactsSnap = await getDocs(artifactsRef);
  
  for (const artifactDoc of artifactsSnap.docs) {
    const data = artifactDoc.data();
    if (data.taskId === taskId) {
      await deleteDoc(artifactDoc.ref);
      console.log('Deleted artifact:', data.name);
    }
  }
  
  // Delete chat messages
  console.log('\nDeleting chat messages...');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnap = await getDocs(chatRef);
  
  for (const msgDoc of chatSnap.docs) {
    await deleteDoc(msgDoc.ref);
  }
  console.log('Deleted', chatSnap.size, 'messages');
  
  console.log('\nTask reset complete!');
  console.log('Navigate to task and it will regenerate with multiple carrier emails');
  console.log('URL: http://localhost:9002/companies/' + companyId + '/tasks/' + taskId);
}

resetTask()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
