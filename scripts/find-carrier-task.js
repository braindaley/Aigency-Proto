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

async function findCarrierTask() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Searching for carrier-related tasks...\n');

  const tasksRef = collection(db, 'companyTasks');
  const q = query(tasksRef, where('companyId', '==', companyId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} total tasks for this company\n`);

  const carrierTasks = [];
  snapshot.forEach(doc => {
    const task = doc.data();
    const name = (task.taskName || '').toLowerCase();
    if (name.includes('carrier') || name.includes('identify')) {
      carrierTasks.push({
        id: doc.id,
        name: task.taskName,
        status: task.status,
        sortOrder: task.sortOrder,
        phase: task.phase
      });
    }
  });

  console.log('Tasks containing "carrier" or "identify":');
  carrierTasks.forEach(task => {
    console.log(`\n  ${task.id}`);
    console.log(`    Name: ${task.name}`);
    console.log(`    Status: ${task.status}`);
    console.log(`    Sort Order: ${task.sortOrder}`);
    console.log(`    Phase: ${task.phase}`);
  });

  // Check for artifacts in completed carrier tasks
  for (const task of carrierTasks) {
    if (task.status === 'completed') {
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const artifactsQuery = query(artifactsRef, where('taskId', '==', task.id));
      const artifactsSnapshot = await getDocs(artifactsQuery);

      console.log(`\n  Artifacts for ${task.id}: ${artifactsSnapshot.size}`);

      artifactsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`    - ${data.name} (${(data.data || '').length} chars)`);
      });
    }
  }
}

findCarrierTask().catch(console.error);
