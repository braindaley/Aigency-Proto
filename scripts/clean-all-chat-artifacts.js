/**
 * Clean up ALL chat messages across all tasks by removing artifact content
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, collectionGroup, query, updateDoc } = require('firebase/firestore');

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

async function cleanAllChatArtifacts() {
  console.log('=== CLEANING ALL CHAT ARTIFACTS ===\n');

  let totalMessagesProcessed = 0;
  let totalMessagesCleaned = 0;

  try {
    // Get all messages from all taskChats using collectionGroup
    console.log('Scanning all chat messages across all tasks...');
    const messagesQuery = query(collectionGroup(db, 'messages'));
    const messagesSnapshot = await getDocs(messagesQuery);

    console.log(`Found ${messagesSnapshot.docs.length} total messages\n`);

    for (const msgDoc of messagesSnapshot.docs) {
      totalMessagesProcessed++;
      const msgData = msgDoc.data();

      if (!msgData.content || typeof msgData.content !== 'string') continue;

      // Check if message contains artifact tags
      const hasArtifact = msgData.content.includes('<artifact>');

      if (hasArtifact) {
        // Extract any text before/after the artifact
        let cleanContent = msgData.content.replace(/<artifact>[\s\S]*?<\/artifact>/g, '').trim();

        // Also remove common markdown code block markers around JSON
        cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        // If no meaningful content remains, replace with summary
        if (!cleanContent || cleanContent.length < 20) {
          cleanContent = `I've generated the requested document. You can view it in the artifact viewer or download it from the artifacts section.`;
        }

        // Update the message with cleaned content
        await updateDoc(msgDoc.ref, {
          content: cleanContent,
          cleanedAt: new Date().toISOString(),
          hadArtifact: true
        });

        totalMessagesCleaned++;

        if (totalMessagesCleaned % 10 === 0) {
          console.log(`  Processed ${totalMessagesCleaned} messages...`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`Total messages scanned: ${totalMessagesProcessed}`);
  console.log(`Messages cleaned: ${totalMessagesCleaned}`);
  console.log(`\n✅ All chat artifacts have been cleaned!`);
  console.log('Refresh any open task pages to see the cleaned chat messages.');
}

cleanAllChatArtifacts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
