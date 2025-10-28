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

async function checkCarrierSearch() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const taskId = 'ijkbooN3Mg8bFv1sE4wT'; // Search suitable carriers task

  console.log('Checking carrier search results...\n');

  // Get artifacts for this task
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
  const artifactsSnapshot = await getDocs(artifactsQuery);

  console.log(`Found ${artifactsSnapshot.size} artifacts\n`);

  artifactsSnapshot.forEach((artifactDoc, idx) => {
    const data = artifactDoc.data();
    console.log(`📄 Artifact ${idx + 1}:`);
    console.log('   Name:', data.name);
    console.log('   Content (first 1500 chars):');
    console.log('   ---');
    const content = data.data || '';
    console.log('   ' + content.substring(0, 1500).replace(/\n/g, '\n   '));
    console.log('   ---\n');
  });
}

checkCarrierSearch().catch(console.error);
