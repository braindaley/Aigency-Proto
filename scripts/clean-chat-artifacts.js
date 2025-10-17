/**
 * Clean up chat messages by removing artifact content
 * This will remove <artifact>...</artifact> tags and content from existing chat messages
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } = require('firebase/firestore');

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

// Task IDs to clean
const taskIds = [
  'Ubao1CBbWatHi0emkgVe', // Generate coverage suggestions
  '0DL0g4DjJXmCkT02hm3f', // ACORD 125
  'ubzOt0QWVFXxSYXEZOzM'  // ACORD 130
];

async function cleanChatArtifacts() {
  console.log('=== CLEANING CHAT ARTIFACTS ===\n');

  let totalMessagesProcessed = 0;
  let totalMessagesCleaned = 0;
  let totalMessagesDeleted = 0;

  for (const taskId of taskIds) {
    console.log(`\nProcessing task: ${taskId}`);

    try {
      // Get all chat messages for this task
      const chatRef = collection(db, 'taskChats', taskId, 'messages');
      const chatSnapshot = await getDocs(chatRef);

      console.log(`  Found ${chatSnapshot.docs.length} messages`);

      for (const msgDoc of chatSnapshot.docs) {
        totalMessagesProcessed++;
        const msgData = msgDoc.data();

        if (!msgData.content) continue;

        // Check if message contains artifact tags
        const hasArtifact = msgData.content.includes('<artifact>');

        if (hasArtifact) {
          // Extract any text before/after the artifact
          let cleanContent = msgData.content.replace(/<artifact>[\s\S]*?<\/artifact>/g, '').trim();

          // If no meaningful content remains, delete the message or replace with summary
          if (!cleanContent || cleanContent.length < 20) {
            // Option 1: Delete the message entirely
            // await deleteDoc(msgDoc.ref);
            // totalMessagesDeleted++;
            // console.log(`    ✅ Deleted empty artifact message`);

            // Option 2: Replace with summary message (better UX)
            cleanContent = `I've generated the requested document. You can view it in the artifact viewer or download it from the artifacts section.`;
          }

          // Update the message with cleaned content
          await updateDoc(msgDoc.ref, {
            content: cleanContent,
            cleanedAt: new Date().toISOString(),
            hadArtifact: true
          });

          totalMessagesCleaned++;
          console.log(`    ✅ Cleaned message (${msgData.content.length} → ${cleanContent.length} chars)`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error processing task ${taskId}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`Total messages processed: ${totalMessagesProcessed}`);
  console.log(`Messages cleaned: ${totalMessagesCleaned}`);
  console.log(`Messages deleted: ${totalMessagesDeleted}`);
}

cleanChatArtifacts()
  .then(() => {
    console.log('\n✅ All chat artifacts cleaned successfully!');
    console.log('Refresh the task pages to see the cleaned chat messages.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
