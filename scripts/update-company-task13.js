const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, serverTimestamp } = require('firebase/firestore');
const fs = require('fs');

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

async function updateCompanyTask13() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const task13Id = 'B10M67bZTVuuI5TFDjRz';

  console.log('\n📋 Reading updated Task 13 from JSON...');
  const tasks = JSON.parse(fs.readFileSync('workers-comp-tasks-complete.json', 'utf8'));
  const task13Template = tasks.find(t => t.id === 'XajTm0iTsvZX4RIXGmD6');

  if (!task13Template) {
    console.error('❌ Task 13 template not found in JSON');
    process.exit(1);
  }

  console.log('✅ Found Task 13 template');
  console.log(`   System prompt length: ${task13Template.systemPrompt.length} characters`);

  // Update the company task
  console.log('\n📝 Updating company task in Firestore...');
  const taskRef = doc(db, 'companyTasks', task13Id);

  await updateDoc(taskRef, {
    systemPrompt: task13Template.systemPrompt,
    description: task13Template.description,
    updatedAt: serverTimestamp()
  });

  console.log('✅ Company Task 13 updated successfully');

  // Also reset status to pending so it can be re-run
  console.log('\n🔄 Resetting task status to pending...');
  await updateDoc(taskRef, {
    status: 'pending',
    updatedAt: serverTimestamp()
  });

  console.log('✅ Task status reset to pending');
  console.log('\n✨ Done! You can now regenerate Task 13 and it will:');
  console.log('   1. Look at Task 11 for the carrier list');
  console.log('   2. Create EXACTLY the same number of follow-up emails');
  console.log('   3. Use proper broker-to-underwriter tone');
  console.log('   4. Avoid including task/system references');

  process.exit(0);
}

updateCompanyTask13().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
