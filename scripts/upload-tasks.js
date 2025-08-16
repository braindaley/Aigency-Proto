
// This script reads the tasks from src/lib/data.ts and uploads them to your Firestore database.
// To run this script, you will need to install the Firebase Admin SDK:
// npm install firebase-admin
// You will also need to download a service account key from your Firebase project settings
// and save it as 'serviceAccountKey.json' in the root of your project.

const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');
const { tasks } = require('../../src/lib/data.ts');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const uploadTasks = async () => {
  const tasksCollection = db.collection('tasks');

  for (const task of tasks) {
    await tasksCollection.doc(task.id.toString()).set(task);
  }

  console.log('Tasks uploaded successfully!');
};

uploadTasks().catch(console.error);
