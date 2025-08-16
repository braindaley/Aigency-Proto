
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function addSequentialDependencies() {
  const tasksRef = db.collection('tasks');
  const snapshot = await tasksRef.where('policyType', '==', 'workers-comp').get();

  if (snapshot.empty) {
    console.log('No workers-comp tasks found.');
    return;
  }

  // Convert snapshot to an array and sort by ID
  const tasks = [];
  snapshot.forEach(doc => {
    tasks.push({ id: doc.id, ...doc.data() });
  });

  // Firestore IDs are strings, so we need a numeric sort.
  // We'll assume the IDs are either numbers or can be parsed as such.
  tasks.sort((a, b) => {
    const idA = parseInt(a.id, 10);
    const idB = parseInt(b.id, 10);

    // If parsing fails for any reason, fall back to string comparison
    if (isNaN(idA) || isNaN(idB)) {
      return a.id.localeCompare(b.id);
    }
    return idA - idB;
  });

  console.log(`Found ${tasks.length} workers-comp tasks to process.`);

  const batch = db.batch();
  for (let i = 0; i < tasks.length; i++) {
    const currentTask = tasks[i];
    
    // The first task has no dependency
    if (i === 0) {
        console.log(`Task ${currentTask.id} (${currentTask.taskName}) is the first, skipping dependency.`);
        // Optional: Ensure it has no dependencies
        batch.update(tasksRef.doc(currentTask.id), { dependencies: [] });
        continue;
    }
    
    const previousTask = tasks[i - 1];
    const dependencyId = previousTask.id;

    console.log(`Setting dependency for Task ${currentTask.id} (${currentTask.taskName}) to Task ${dependencyId}`);
    
    batch.update(tasksRef.doc(currentTask.id), {
      dependencies: [dependencyId]
    });
  }

  await batch.commit();
  console.log(`\nDependency update complete. Updated ${tasks.length} documents.`);
}

addSequentialDependencies().catch(console.error);
