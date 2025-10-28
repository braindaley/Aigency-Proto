const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function fixInterfaceType() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';

  console.log('Updating interface type for marketing emails task...\n');

  // Change interfaceType from 'artifact' to null (which will default to 'chat')
  // This will use TaskAIArtifacts component which supports multiple artifacts
  await updateDoc(doc(db, 'companyTasks', taskId), {
    interfaceType: null
  });

  console.log('✅ Interface type updated to null (will use TaskAIArtifacts)');
  console.log('\n📝 This component supports multi-artifact display with navigation arrows');
  console.log('\nPlease refresh the page to see the changes');
}

fixInterfaceType().catch(console.error);
