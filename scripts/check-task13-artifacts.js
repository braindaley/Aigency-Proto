const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAPbristGE8ytc59RD-KL0JMJL-EuVW23R8",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "326368003305",
  appId: "1:326368003305:web:0c95f9e94ed99f4ac27bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTaskArtifacts() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const taskId = 'B10M67bZTVuuI5TFDjRz'; // Task 13

  console.log('\nChecking artifacts for Task 13...');

  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q = query(artifactsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} artifacts\n`);

  snapshot.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`Artifact ${idx + 1}:`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  Name: ${data.name}`);
    console.log(`  Artifact ID: ${data.artifactId || 'none'}`);
    console.log(`  Artifact Index: ${data.artifactIndex !== undefined ? data.artifactIndex : 'none'}`);
    console.log(`  Total Artifacts: ${data.totalArtifacts || 'none'}`);
    console.log(`  Tags: ${data.tags?.join(', ') || 'none'}`);
    console.log(`  Content length: ${data.data?.length || 0} characters`);
    console.log(`  Content preview: ${(data.data || '').substring(0, 100)}...\n`);
  });

  process.exit(0);
}

checkTaskArtifacts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
