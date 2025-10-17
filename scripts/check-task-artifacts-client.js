const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');

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

async function checkTaskArtifacts() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const taskId = 'IuFlbSqoJsRw1HuQMhTA';

  console.log('\n=== Checking Task Chat Messages ===');

  // Get chat messages for this task
  const chatsRef = collection(db, `companies/${companyId}/taskChats`);
  const q = query(
    chatsRef,
    where('taskId', '==', taskId)
  );

  const chatSnapshot = await getDocs(q);

  console.log(`Found ${chatSnapshot.docs.length} chat messages`);

  chatSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n--- Message ${index + 1} ---`);
    console.log('Role:', data.role);
    console.log('Timestamp:', data.timestamp?.toDate?.());

    if (data.content) {
      const artifactMatches = data.content.match(/<artifact[^>]*>/g);
      if (artifactMatches) {
        console.log(`Found ${artifactMatches.length} artifact tags in message`);

        // Show each artifact tag
        artifactMatches.forEach((match, i) => {
          console.log(`  Artifact ${i + 1}: ${match}`);
        });

        // Extract artifact titles
        const titleRegex = /<artifact(?:\s+id="([^"]*)")?(?:\s+title="([^"]*)")?>[\s\S]*?<\/artifact>/g;
        let match;
        const artifacts = [];
        while ((match = titleRegex.exec(data.content)) !== null) {
          artifacts.push({
            id: match[1] || 'no-id',
            title: match[2] || 'no-title'
          });
        }

        console.log('\nArtifacts found:');
        artifacts.forEach((artifact, i) => {
          console.log(`  ${i + 1}. ID: "${artifact.id}", Title: "${artifact.title}"`);
        });
      } else {
        console.log('No artifact tags found in this message');
      }

      // Show first 200 characters
      console.log('Content preview:', data.content.substring(0, 200) + '...');
    }
  });

  console.log('\n\n=== Checking Artifacts Collection ===');

  // Check artifacts collection
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
  const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
  const artifactsSnapshot = await getDocs(artifactsQuery);

  console.log(`Found ${artifactsSnapshot.docs.length} artifacts in database`);

  artifactsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n--- Artifact ${index + 1} ---`);
    console.log('ID:', doc.id);
    console.log('Name:', data.name);
    console.log('Task ID:', data.taskId);
    console.log('Created At:', data.createdAt?.toDate?.());
    console.log('Content length:', data.data?.length || 0, 'characters');
    if (data.data) {
      console.log('Content preview:', data.data.substring(0, 150) + '...');
    }
  });

  process.exit(0);
}

checkTaskArtifacts().catch(console.error);
