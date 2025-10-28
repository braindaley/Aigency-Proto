const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

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

async function findAndDeleteDuplicates() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Finding duplicate artifacts...\n');

  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const snapshot = await getDocs(artifactsRef);

  const taskArtifacts = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.taskId === taskId;
  });

  console.log(`Found ${taskArtifacts.length} total artifacts for this task\n`);

  // Find artifacts that don't have proper carrier names (the duplicates)
  const duplicates = taskArtifacts.filter(doc => {
    const data = doc.data();
    const name = data.name || '';
    const artifactId = data.artifactId || '';

    // These are the duplicates - they don't have a specific carrier name
    return !artifactId || artifactId === 'Draft custom marketing emails' ||
           name === 'Draft custom marketing emails' ||
           (!name.includes('Starr') && !name.includes('Berkshire') &&
            !name.includes('Travelers') && !name.includes('Hartford') &&
            !name.includes('Chubb'));
  });

  console.log(`Found ${duplicates.length} duplicate/generic artifacts to delete:\n`);

  for (const dupDoc of duplicates) {
    const data = dupDoc.data();
    console.log(`  ${dupDoc.id}`);
    console.log(`    Name: ${data.name}`);
    console.log(`    Artifact ID: ${data.artifactId || 'none'}`);
    console.log(`    Content length: ${(data.data || '').length} chars`);
    console.log(`    Deleting...`);

    await deleteDoc(doc(db, `companies/${companyId}/artifacts`, dupDoc.id));
    console.log(`    ✅ Deleted\n`);
  }

  console.log(`\n✅ Deleted ${duplicates.length} duplicate artifacts`);
  console.log(`\nRemaining artifacts: ${taskArtifacts.length - duplicates.length}`);
}

findAndDeleteDuplicates().catch(console.error);
