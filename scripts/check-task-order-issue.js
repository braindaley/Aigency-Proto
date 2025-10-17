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

async function checkOrders() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CHECKING ALL WORKERS COMP TASKS ===\n');
  
  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, 
    where('companyId', '==', companyId),
    where('renewalType', '==', 'workers-comp')
  );
  const snapshot = await getDocs(q);
  
  const tasks = [];
  snapshot.forEach(doc => {
    tasks.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  // Sort by order if available
  tasks.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return 0;
  });
  
  console.log('Total tasks:', tasks.length);
  console.log('');
  
  let hasOrder = 0;
  let noOrder = 0;
  
  tasks.forEach(task => {
    const orderStr = task.order !== undefined ? task.order.toString() : 'MISSING';
    console.log(orderStr.padEnd(8) + ' | ' + task.status.padEnd(15) + ' | ' + task.taskName);
    
    if (task.order !== undefined) {
      hasOrder++;
    } else {
      noOrder++;
    }
  });
  
  console.log('\n=== SUMMARY ===');
  console.log('Tasks with order field:', hasOrder);
  console.log('Tasks missing order field:', noOrder);
  
  if (noOrder > 0) {
    console.log('\nISSUE: Some tasks are missing the order field!');
    console.log('This can cause problems with dependency checking and task sequencing.');
  }
  
  // Check specific task
  const targetTask = tasks.find(t => t.id === 'uvt9zQYGgm0dmEhYQ0a5');
  if (targetTask) {
    console.log('\n=== TARGET TASK ===');
    console.log('ID: uvt9zQYGgm0dmEhYQ0a5');
    console.log('Name:', targetTask.taskName);
    console.log('Status:', targetTask.status);
    console.log('Order:', targetTask.order);
    console.log('Has dependencies:', !!(targetTask.dependencies && targetTask.dependencies.length > 0));
  }
}

checkOrders()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
