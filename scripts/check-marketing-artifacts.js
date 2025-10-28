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

async function checkMarketingArtifacts() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking marketing email artifacts...\n');

  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q = query(artifactsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} artifacts for this task:\n`);

  let idx = 1;
  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`${idx}. Artifact: ${doc.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Artifact ID: ${data.artifactId || 'none'}`);
    console.log(`   Artifact Index: ${data.artifactIndex ?? 'none'}`);
    console.log(`   Total Artifacts: ${data.totalArtifacts ?? 'none'}`);
    console.log(`   Content length: ${(data.data || '').length} chars`);
    console.log(`   First 100 chars: ${(data.data || '').substring(0, 100)}...`);
    console.log('');
    idx++;
  });
}

checkMarketingArtifacts().catch(console.error);
