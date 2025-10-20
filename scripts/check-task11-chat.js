const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAPbristGE8ytc59RD-KL0JMJL-EuVW23R8",
  authDomain: "aigency-mvp.firebaseapp.com",
  projectId: "aigency-mvp",
  storageBucket: "aigency-mvp.firebasestorage.app",
  messagingSenderId: "326368003305",
  appId: "1:326368003305:web:0c95f9e94ed99f4ac27bd2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTask11Chat() {
  const task11Id = 'fJoluhxjOBMTMl6uERew'; // Task 11

  console.log('\n=== Task 11 Chat Messages ===');

  const chatRef = collection(db, 'taskChats', task11Id, 'messages');
  const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
  const chatSnapshot = await getDocs(chatQuery);

  console.log(`\nFound ${chatSnapshot.size} chat messages\n`);

  chatSnapshot.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`\nMessage ${idx + 1}:`);
    console.log(`  Role: ${data.role}`);
    console.log(`  Content length: ${(data.content || '').length} characters`);

    // Check for artifact tags
    const content = data.content || '';
    const hasArtifactTag = content.includes('<artifact');
    const artifactMatches = content.match(/<artifact[^>]*>/g);

    console.log(`  Contains <artifact> tags: ${hasArtifactTag}`);
    if (artifactMatches) {
      console.log(`  Number of <artifact> tags: ${artifactMatches.length}`);
      console.log(`  Artifact tags found:`);
      artifactMatches.forEach((match, i) => {
        console.log(`    ${i + 1}. ${match}`);
      });
    }

    // Show first 500 characters
    console.log(`  Content preview:`);
    console.log(`    ${content.substring(0, 500)}...`);
  });

  process.exit(0);
}

checkTask11Chat().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
