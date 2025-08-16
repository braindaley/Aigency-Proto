
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function addPolicyTypeToTasks() {
  const tasksRef = db.collection('tasks');
  const snapshot = await tasksRef.get();

  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, { policyType: 'workers-comp' });
  });

  await batch.commit();
  console.log(`Updated ${snapshot.size} documents.`);
}

addPolicyTypeToTasks().catch(console.error);
