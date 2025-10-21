const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-admin.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

async function checkTaskMessages(taskId) {
  console.log(`\n🔍 Checking messages for task: ${taskId}\n`);

  try {
    const messagesRef = db.collection('taskChats').doc(taskId).collection('messages');
    const snapshot = await messagesRef.orderBy('timestamp', 'asc').get();

    if (snapshot.empty) {
      console.log('❌ No messages found for this task');
      return;
    }

    console.log(`✅ Found ${snapshot.size} total messages\n`);

    // Group messages by role and content to detect duplicates
    const messageGroups = {};
    const duplicates = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.role}:::${data.content?.substring(0, 100)}`;

      if (!messageGroups[key]) {
        messageGroups[key] = [];
      }

      messageGroups[key].push({
        id: doc.id,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
        isInitialMessage: data.isInitialMessage,
        messageId: data.messageId
      });
    });

    // Check for duplicates
    Object.entries(messageGroups).forEach(([key, messages]) => {
      if (messages.length > 1) {
        duplicates.push({
          key: key.split(':::')[1], // Just the content preview
          role: key.split(':::')[0],
          count: messages.length,
          messages: messages
        });
      }
    });

    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATE MESSAGES DETECTED:\n');
      duplicates.forEach(dup => {
        console.log(`Role: ${dup.role}`);
        console.log(`Content preview: "${dup.key}..."`);
        console.log(`Count: ${dup.count} duplicates`);
        console.log('Message details:');
        dup.messages.forEach(msg => {
          console.log(`  - ID: ${msg.id}`);
          console.log(`    Timestamp: ${msg.timestamp}`);
          console.log(`    IsInitial: ${msg.isInitialMessage || false}`);
          console.log(`    MessageId: ${msg.messageId || 'none'}`);
        });
        console.log('---');
      });
    } else {
      console.log('✅ No duplicate messages found!');
    }

    // Show all messages in order
    console.log('\n📝 All messages in order:\n');
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. [${data.role}] ${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : 'no timestamp'}`);
      console.log(`   Content: "${data.content?.substring(0, 80)}..."`);
      if (data.isInitialMessage) console.log(`   ⭐ Initial Message (ID: ${data.messageId})`);
      console.log('');
    });

  } catch (error) {
    console.error('Error checking messages:', error);
  }
}

// Task ID from the URL
const taskId = 'l81uYrqecUzT6SRXcfZJ';

checkTaskMessages(taskId).then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});