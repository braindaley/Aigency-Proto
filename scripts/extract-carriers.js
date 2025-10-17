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

async function extract() {
  const carrierTaskId = 'IOnyUqYEMBjXj6BQwbx0';
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  
  const artifactsRef = collection(db, 'companies', companyId, 'artifacts');
  const snap = await getDocs(artifactsRef);
  
  const artifact = snap.docs.find(doc => doc.data().taskId === carrierTaskId);
  
  if (artifact) {
    const content = artifact.data().data;
    
    // Look for the IDENTIFIED CARRIERS section
    const startIdx = content.indexOf('## IDENTIFIED CARRIERS');
    const endIdx = content.indexOf('## CARRIER SUMMARY TABLE');
    
    if (startIdx !== -1 && endIdx !== -1) {
      const carriersSection = content.substring(startIdx, endIdx);
      console.log('=== CARRIERS SECTION ===\n');
      console.log(carriersSection.substring(0, 3000));
    }
  }
}

extract()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
