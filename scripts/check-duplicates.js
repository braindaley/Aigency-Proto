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

async function checkDuplicates() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const task13Id = 'GwnjdfTi1JOPGBcpPWot';

  console.log('=== TASK 13 ARTIFACTS ===\n');

  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q = query(artifactsRef, where('taskId', '==', task13Id));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} artifacts\n`);

  const artifacts = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    artifacts.push({
      id: doc.id,
      name: data.name,
      artifactId: data.artifactId,
      contentLength: data.content?.length || 0
    });
  });

  artifacts.forEach((art, idx) => {
    console.log(`${idx + 1}. ${art.name}`);
    console.log(`   DB ID: ${art.id}`);
    console.log(`   Artifact ID: ${art.artifactId}`);
    console.log(`   Content: ${art.contentLength} chars`);
    console.log('');
  });

  // Check for duplicates
  const names = artifacts.map(a => a.name);
  const uniqueNames = [...new Set(names)];

  if (names.length !== uniqueNames.length) {
    console.log('⚠️  DUPLICATE ARTIFACTS DETECTED!\n');
    console.log(`Unique carriers: ${uniqueNames.length}`);
    console.log(`Total artifacts: ${names.length}\n`);

    const nameCounts = {};
    names.forEach(name => {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    console.log('Breakdown:');
    Object.entries(nameCounts).forEach(([name, count]) => {
      console.log(`  ${name}: ${count} ${count > 1 ? '❌ DUPLICATE' : '✅'}`);
    });
  } else {
    console.log('✅ No duplicates - all artifacts are unique');
  }
}

checkDuplicates().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
