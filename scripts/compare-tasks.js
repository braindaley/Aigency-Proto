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

async function compareTasks() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const task11Id = 'fJoluhxjOBMTMl6uERew'; // Working task with 5 emails
  const task13Id = 'B10M67bZTVuuI5TFDjRz'; // Task 13 that needs fixing

  console.log('\n=== TASK 11 (Working - Draft custom marketing emails) ===');
  await checkArtifacts(companyId, task11Id);

  console.log('\n=== TASK 13 (Not working - Draft follow-up emails) ===');
  await checkArtifacts(companyId, task13Id);

  process.exit(0);
}

async function checkArtifacts(companyId, taskId) {
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const q = query(artifactsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`\nFound ${snapshot.size} artifacts:`);

  const artifacts = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    artifacts.push({
      id: doc.id,
      name: data.name,
      artifactId: data.artifactId,
      artifactIndex: data.artifactIndex,
      totalArtifacts: data.totalArtifacts,
      tags: data.tags
    });
  });

  // Sort by artifactIndex
  artifacts.sort((a, b) => (a.artifactIndex || 0) - (b.artifactIndex || 0));

  artifacts.forEach((artifact, idx) => {
    console.log(`\n  Artifact ${idx + 1}:`);
    console.log(`    Database ID: ${artifact.id}`);
    console.log(`    Name: ${artifact.name}`);
    console.log(`    Artifact ID: ${artifact.artifactId || 'none'}`);
    console.log(`    Artifact Index: ${artifact.artifactIndex !== undefined ? artifact.artifactIndex : 'none'}`);
    console.log(`    Total Artifacts: ${artifact.totalArtifacts || 'none'}`);
    console.log(`    Tags: ${artifact.tags?.join(', ') || 'none'}`);
  });
}

compareTasks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
