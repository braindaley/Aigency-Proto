const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, deleteField } = require('firebase/firestore');

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

async function deleteInterfaceType() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';

  console.log('Removing interfaceType field from task...\n');

  try {
    await updateDoc(doc(db, 'companyTasks', taskId), {
      interfaceType: deleteField()
    });

    console.log('✅ Interface type field deleted');
    console.log('\nTask will now use default logic based on dependencies');
    console.log('Expected: TaskAIArtifacts component (chat interface with multi-artifact support)');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteInterfaceType().catch(console.error);
