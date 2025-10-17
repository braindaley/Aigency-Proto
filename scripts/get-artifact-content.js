const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function get() {
  const artifactsRef = collection(db, 'companies', 'qsu1QXPB8TUK2P4QyDiy', 'artifacts');
  const snap = await getDocs(artifactsRef);
  
  const artifact = snap.docs.find(doc => doc.data().taskId === 'IuFlbSqoJsRw1HuQMhTA');
  
  if (artifact) {
    const data = artifact.data();
    console.log('=== ARTIFACT: Send submission packets ===\n');
    console.log(data.data);
  } else {
    console.log('Artifact not found');
  }
}

get()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
