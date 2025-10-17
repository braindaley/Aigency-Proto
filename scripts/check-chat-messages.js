const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkChatMessages() {
  const taskId = 'IuFlbSqoJsRw1HuQMhTA';

  console.log('\n=== Checking taskChats collection ===');

  // Get all messages in the taskChats/{taskId}/messages subcollection
  const messagesRef = collection(db, 'taskChats', taskId, 'messages');
  const messagesSnapshot = await getDocs(messagesRef);

  console.log(`Found ${messagesSnapshot.docs.length} messages in taskChats/${taskId}/messages\n`);

  messagesSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`--- Message ${index + 1} (${doc.id}) ---`);
    console.log('Role:', data.role);
    console.log('Timestamp:', data.timestamp?.toDate?.());

    if (data.content) {
      // Check for multiple artifacts
      const artifactMatches = data.content.match(/<artifact[^>]*>/g);

      if (artifactMatches) {
        console.log(`\n✅ Found ${artifactMatches.length} artifact tag(s)`);

        // Extract detailed info
        const regex = /<artifact(?:\s+id="([^"]*)")?(?:\s+title="([^"]*)")?>[\s\S]*?<\/artifact>/g;
        let match;
        let artifactNum = 1;

        while ((match = regex.exec(data.content)) !== null) {
          console.log(`  ${artifactNum}. ID: "${match[1] || 'none'}", Title: "${match[2] || 'none'}"`);
          artifactNum++;
        }
      } else {
        console.log('\n❌ No artifact tags found');
      }

      console.log('\nFirst 300 characters of content:');
      console.log(data.content.substring(0, 300) + '...\n');
    } else {
      console.log('No content in this message\n');
    }
  });

  process.exit(0);
}

checkChatMessages().catch(console.error);
