const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkTask() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const taskId = 'IOnyUqYEMBjXj6BQwbx0';
  
  console.log('=== CHECKING TASK ===\n');
  
  // Get the company task
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('ERROR: Task not found');
    return;
  }
  
  const taskData = taskDoc.data();
  console.log('Task Name:', taskData.taskName);
  console.log('Status:', taskData.status);
  console.log('Template ID:', taskData.templateId);
  console.log('Dependencies:', JSON.stringify(taskData.dependencies || [], null, 2));
  
  // Get the template
  if (taskData.templateId) {
    console.log('\n=== CHECKING TEMPLATE ===\n');
    const templateRef = doc(db, 'tasks', taskData.templateId);
    const templateDoc = await getDoc(templateRef);
    
    if (templateDoc.exists()) {
      const templateData = templateDoc.data();
      console.log('Template Name:', templateData.taskName);
      console.log('System Prompt Length:', templateData.systemPrompt?.length || 0, 'characters');
      console.log('Test Criteria Length:', templateData.testCriteria?.length || 0, 'characters');
      console.log('Has System Prompt:', !!templateData.systemPrompt);
      console.log('Has Test Criteria:', !!templateData.testCriteria);
      
      if (templateData.systemPrompt) {
        console.log('\nFirst 200 chars of system prompt:');
        console.log(templateData.systemPrompt.substring(0, 200));
      }
    } else {
      console.log('ERROR: Template not found');
    }
  }
  
  // Check dependency tasks
  if (taskData.dependencies && taskData.dependencies.length > 0) {
    console.log('\n=== CHECKING DEPENDENCIES ===\n');
    
    for (const depId of taskData.dependencies) {
      // Check if it's a template ID or task ID
      const companyTasksRef = collection(db, 'companyTasks');
      const q = query(companyTasksRef, 
        where('templateId', '==', depId),
        where('companyId', '==', companyId)
      );
      const depSnapshot = await getDocs(q);
      
      if (!depSnapshot.empty) {
        const depTask = depSnapshot.docs[0];
        const depData = depTask.data();
        console.log(`Dependency: ${depData.taskName}`);
        console.log(`  Status: ${depData.status}`);
        console.log(`  Task ID: ${depTask.id}`);
        
        // Check for artifacts
        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const artifactsSnapshot = await getDocs(artifactsRef);
        const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.taskId === depTask.id;
        });
        
        console.log(`  Artifacts: ${taskArtifacts.length} found`);
        if (taskArtifacts.length > 0) {
          taskArtifacts.forEach((artifact, idx) => {
            const artData = artifact.data();
            console.log(`    ${idx + 1}. ${artData.name} (${artData.data?.length || 0} chars)`);
          });
        }
      } else {
        console.log(`Dependency ${depId}: No matching company task found`);
      }
    }
  }
  
  // Check chat messages
  console.log('\n=== CHECKING CHAT MESSAGES ===\n');
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const chatSnapshot = await getDocs(chatRef);
  console.log('Total messages:', chatSnapshot.size);
  
  if (chatSnapshot.size > 0) {
    const messages = chatSnapshot.docs.map(d => d.data());
    const lastMessage = messages[messages.length - 1];
    console.log('\nLast message:');
    console.log('  Role:', lastMessage.role);
    console.log('  Content length:', lastMessage.content?.length || 0);
    console.log('  First 200 chars:', lastMessage.content?.substring(0, 200) || 'N/A');
  }
}

checkTask()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
