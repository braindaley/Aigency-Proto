const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, getDoc, doc } = require('firebase/firestore');

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

async function compareTasks() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const task1Id = 'YilhpZgWUxGLloeTWw6c'; // Task that's not working
  const task2Id = 'RARYeXVoPmu7Vu8YI9Ba'; // Working task

  console.log('=== COMPARING TASKS ===\n');

  // Get both company tasks
  const companyTasksRef = collection(db, 'companyTasks');
  const q = query(companyTasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  let task1Data = null;
  let task2Data = null;

  snapshot.forEach(docSnap => {
    if (docSnap.id === task1Id) {
      task1Data = { id: docSnap.id, ...docSnap.data() };
    } else if (docSnap.id === task2Id) {
      task2Data = { id: docSnap.id, ...docSnap.data() };
    }
  });

  console.log('=== TASK 1 (YilhpZgWUxGLloeTWw6c - NOT WORKING) ===');
  console.log(`Name: ${task1Data?.taskName}`);
  console.log(`Template ID: ${task1Data?.templateId}`);
  console.log(`Status: ${task1Data?.status}`);
  console.log(`Dependencies: ${JSON.stringify(task1Data?.dependencies)}`);

  console.log('\n=== TASK 2 (RARYeXVoPmu7Vu8YI9Ba - WORKING) ===');
  console.log(`Name: ${task2Data?.taskName}`);
  console.log(`Template ID: ${task2Data?.templateId}`);
  console.log(`Status: ${task2Data?.status}`);
  console.log(`Dependencies: ${JSON.stringify(task2Data?.dependencies)}`);

  // Now get the templates to compare
  if (task1Data?.templateId && task2Data?.templateId) {
    console.log('\n=== FETCHING TEMPLATES ===\n');

    const template1Doc = await getDoc(doc(db, 'taskTemplates', task1Data.templateId));
    const template2Doc = await getDoc(doc(db, 'taskTemplates', task2Data.templateId));

    if (template1Doc.exists() && template2Doc.exists()) {
      const template1 = template1Doc.data();
      const template2 = template2Doc.data();

      console.log('=== TEMPLATE 1 (NOT WORKING) ===');
      console.log(`Name: ${template1.name}`);
      console.log(`System Prompt Length: ${template1.systemPrompt?.length || 0}`);
      console.log(`System Prompt Preview:\n${template1.systemPrompt?.substring(0, 500)}...`);

      console.log('\n=== TEMPLATE 2 (WORKING) ===');
      console.log(`Name: ${template2.name}`);
      console.log(`System Prompt Length: ${template2.systemPrompt?.length || 0}`);
      console.log(`System Prompt Preview:\n${template2.systemPrompt?.substring(0, 500)}...`);
    }
  }

  process.exit(0);
}

compareTasks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
