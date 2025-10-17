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

async function check() {
  const carrierTaskId = 'IOnyUqYEMBjXj6BQwbx0';
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  console.log('=== CHECKING CARRIER RESEARCH ARTIFACT ===\n');
  
  const artifactsRef = collection(db, 'companies', companyId, 'artifacts');
  const snap = await getDocs(artifactsRef);
  
  const artifact = snap.docs.find(doc => doc.data().taskId === carrierTaskId);
  
  if (artifact) {
    const data = artifact.data();
    console.log('Artifact:', data.name);
    console.log('Size:', data.data.length, 'chars\n');
    console.log('Content preview:');
    console.log(data.data.substring(0, 1500));
    console.log('\n...\n');
    
    // Try to extract carrier names
    const carrierMatches = data.data.match(/##\s+([^#\n]+)/g);
    if (carrierMatches) {
      console.log('\n=== IDENTIFIED CARRIERS ===');
      carrierMatches.forEach((match, i) => {
        const name = match.replace(/##\s+/, '').trim();
        if (name && !name.toLowerCase().includes('client') && !name.toLowerCase().includes('summary') && !name.toLowerCase().includes('strategy')) {
          console.log((i + 1) + '. ' + name);
        }
      });
    }
  } else {
    console.log('No artifact found for carrier research task');
  }
}

check()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
