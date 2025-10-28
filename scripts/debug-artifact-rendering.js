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

async function debugArtifactRendering() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Simulating component artifact loading logic...\n');

  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsSnapshot = await getDocs(artifactsRef);

  // Find ALL artifacts for this task
  const taskArtifactDocs = artifactsSnapshot.docs.filter(doc => {
    const data = doc.data();
    return data.taskId === taskId;
  });

  console.log(`✅ Found ${taskArtifactDocs.length} artifacts for task ${taskId}`);

  // Sort by artifactIndex
  const artifactObjects = taskArtifactDocs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      artifactIndex: data.artifactIndex ?? 0,
      totalArtifacts: data.totalArtifacts,
      contentLength: (data.data || '').length
    };
  });

  artifactObjects.sort((a, b) => a.artifactIndex - b.artifactIndex);

  console.log('\n📦 Sorted artifacts:');
  artifactObjects.forEach((art, idx) => {
    console.log(`  ${idx + 1}. ${art.name}`);
    console.log(`     Index: ${art.artifactIndex}, Total: ${art.totalArtifacts}`);
    console.log(`     Content: ${art.contentLength} chars`);
  });

  console.log(`\n✓ artifacts.length = ${artifactObjects.length}`);
  console.log(`✓ artifacts.length > 1? ${artifactObjects.length > 1}`);
  console.log(`\n→ Component should render: ${artifactObjects.length > 1 ? 'MultipleArtifactsViewer' : 'Single Artifact View'}`);
}

debugArtifactRendering().catch(console.error);
