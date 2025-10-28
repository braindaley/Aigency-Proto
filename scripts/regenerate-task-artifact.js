/**
 * Regenerate a specific task's artifact by deleting existing artifacts
 * and re-running the AI task worker
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

// Get task ID and company ID from command line
const taskId = process.argv[2];
const companyId = process.argv[3];

if (!taskId || !companyId) {
  console.error('Usage: node scripts/regenerate-task-artifact.js <taskId> <companyId>');
  console.error('Example: node scripts/regenerate-task-artifact.js GQCaZODIVXwzencirSug OHioSIzK4i7HwcjLbX5r');
  process.exit(1);
}

async function regenerateTaskArtifact() {
  try {
    console.log(`🔄 Regenerating artifact for task ${taskId}...\n`);

    // 1. Delete existing artifacts for this task
    console.log('📦 Checking for existing artifacts...');
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
    const artifactsSnapshot = await getDocs(artifactsQuery);

    if (artifactsSnapshot.empty) {
      console.log('   No existing artifacts found.');
    } else {
      console.log(`   Found ${artifactsSnapshot.size} artifact(s). Deleting...`);
      for (const artifactDoc of artifactsSnapshot.docs) {
        await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactDoc.id));
        console.log(`   ✅ Deleted artifact: ${artifactDoc.id}`);
      }
    }

    // 2. Delete chat messages for this task (optional - allows fresh conversation)
    console.log('\n💬 Checking for existing chat messages...');
    const messagesRef = collection(db, 'taskChats', taskId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    if (messagesSnapshot.empty) {
      console.log('   No existing messages found.');
    } else {
      console.log(`   Found ${messagesSnapshot.size} message(s). Deleting...`);
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(doc(db, 'taskChats', taskId, 'messages', messageDoc.id));
      }
      console.log(`   ✅ Deleted ${messagesSnapshot.size} message(s)`);
    }

    console.log('\n✅ Cleanup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Trigger the AI task completion via the API:');
    console.log(`   curl -X POST http://localhost:9003/api/ai-task-completion \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"taskId":"${taskId}","companyId":"${companyId}"}'`);
    console.log('\n2. Or refresh the task page and the artifact will regenerate automatically');
    console.log(`   http://localhost:9003/companies/${companyId}/tasks/${taskId}`);

  } catch (error) {
    console.error('❌ Error regenerating task artifact:', error);
    process.exit(1);
  }
}

regenerateTaskArtifact()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
