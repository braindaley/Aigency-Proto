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

async function checkCarrierArtifact() {
  const carrierTaskId = 'ijkbooN3Mg8bFv1sE4wT';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q = query(artifactsRef, where('taskId', '==', carrierTaskId));
  const snapshot = await getDocs(q);

  console.log('Carrier Search Task Artifacts:\n');

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('Artifact ID:', doc.id);
    console.log('Name:', data.name);
    console.log('Content length:', (data.data || '').length);
    console.log('\nFirst 500 chars of content:');
    console.log('---');
    console.log((data.data || '').substring(0, 500));
    console.log('---');
  });
}

checkCarrierArtifact().catch(console.error);
