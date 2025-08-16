
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore clients for both projects
const sourceDb = new Firestore({
  projectId: 'pigeon-program',
  // You may need to provide keyFilename if you have service account keys
});
const destDb = new Firestore({
  projectId: 'aigency-proto',
  // You may need to provide keyFilename if you have service account keys
});

async function migrate() {
  console.log('Starting migration of tasks from pigeon-program to aigency-proto...');

  try {
    const sourceCollection = sourceDb.collection('tasks'); // Changed to 'tasks'
    const documents = await sourceCollection.get();

    if (documents.empty) {
      console.log('No documents found in the source tasks collection.');
      return;
    }

    let count = 0;
    const destCollection = destDb.collection('tasks'); // Changed to 'tasks'

    for (const doc of documents.docs) {
      const data = doc.data();
      await destCollection.doc(doc.id).set(data);
      count++;
      console.log(`Migrated task: ${doc.id}`);
    }

    console.log(`\nMigration complete! Successfully migrated ${count} tasks.`);

  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrate();
