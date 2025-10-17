const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkMarketingChain() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CHECKING MARKETING PHASE TASKS ===\n');
  
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, 
    where('companyId', '==', companyId),
    where('renewalType', '==', 'workers-comp'),
    where('phase', '==', 'Marketing')
  );
  const snapshot = await getDocs(q);
  
  const tasks = [];
  snapshot.forEach(doc => {
    tasks.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log('Total Marketing tasks:', tasks.length);
  console.log('');
  
  // Get template info for proper ordering
  const templateIds = [...new Set(tasks.map(t => t.templateId))];
  const templates = {};
  
  for (const templateId of templateIds) {
    const templatesRef = collection(db, 'tasks');
    const tq = query(templatesRef, where('__name__', '==', templateId));
    const tsnap = await getDocs(tq);
    if (!tsnap.empty) {
      templates[templateId] = tsnap.docs[0].data();
    }
  }
  
  // Sort by template order
  tasks.sort((a, b) => {
    const orderA = templates[a.templateId]?.order || 999;
    const orderB = templates[b.templateId]?.order || 999;
    return orderA - orderB;
  });
  
  console.log('Marketing Tasks (in template order):');
  console.log('');
  
  for (const task of tasks) {
    const template = templates[task.templateId];
    const templateOrder = template?.order || '?';
    const deps = task.dependencies || [];
    
    console.log('Order:', templateOrder);
    console.log('Name:', task.taskName);
    console.log('Status:', task.status);
    console.log('Tag:', task.tag);
    console.log('Task ID:', task.id);
    console.log('Template ID:', task.templateId);
    console.log('Dependencies:', deps.length > 0 ? deps.join(', ') : 'None');
    
    if (deps.length > 0) {
      console.log('Dependency status:');
      for (const depId of deps) {
        const depTask = tasks.find(t => t.templateId === depId);
        if (depTask) {
          console.log('  -', depTask.taskName, ':', depTask.status);
        } else {
          console.log('  -', depId, ': NOT FOUND in marketing tasks');
        }
      }
    }
    console.log('');
  }
  
  console.log('=== ISSUE ANALYSIS ===');
  console.log('When an AI task completes, it should call the dependency update endpoint');
  console.log('to change dependent tasks from "Upcoming" to "Needs attention"');
  console.log('');
  console.log('Checking AI completion endpoint behavior...');
}

checkMarketingChain()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
