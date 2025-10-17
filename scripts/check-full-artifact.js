const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB3XlnTBdVIZe8h32wU9OtXvkDv0c-F1t8",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1076469562302",
  appId: "1:1076469562302:web:09a7fb81a51a1d0c3c0c11"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFullArtifact() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const artifactId = 'dVXWUIJqhRd2eVe5Lv7t';

  const artifactRef = doc(db, `companies/${companyId}/artifacts`, artifactId);
  const artifactSnap = await getDoc(artifactRef);

  if (artifactSnap.exists()) {
    const data = artifactSnap.data();
    console.log('=== Full Artifact Content ===\n');
    console.log(data.data);

    // Check for multiple artifact tags
    const artifactMatches = data.data.match(/<artifact[^>]*>/g);
    if (artifactMatches) {
      console.log('\n\n=== MULTIPLE ARTIFACT TAGS FOUND ===');
      console.log(`Found ${artifactMatches.length} artifact tags`);
    } else {
      console.log('\n\n=== NO ARTIFACT TAGS FOUND ===');
      console.log('This appears to be a single artifact without the <artifact> wrapper.');
    }
  } else {
    console.log('Artifact not found');
  }

  process.exit(0);
}

checkFullArtifact().catch(console.error);
