/**
 * Check task dependencies and their artifacts
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, orderBy } = require('firebase/firestore');

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

const taskId = 'KYHqncvTWOpG6Iys5maS';
const companyId = 'qsu1QXPB8TUK2P4QyDiy';

async function checkDependencyArtifacts() {
  console.log('=== CHECKING TASK DEPENDENCY ARTIFACTS ===\n');

  // Get task details
  const taskRef = doc(db, 'companyTasks', taskId);
  const taskDoc = await getDoc(taskRef);

  if (!taskDoc.exists()) {
    console.log('Task not found!');
    return;
  }

  const task = taskDoc.data();

  console.log('Task Details:');
  console.log('  Name:', task.taskName);
  console.log('  Status:', task.status);
  console.log('  Dependencies:', task.dependencies || []);
  console.log('  Dependency count:', (task.dependencies || []).length);

  if (!task.dependencies || task.dependencies.length === 0) {
    console.log('\n❌ No dependencies configured for this task');
    return;
  }

  // Get all tasks for this company to resolve dependencies
  const tasksRef = collection(db, 'companyTasks');
  const tasksSnapshot = await getDocs(tasksRef);

  const allTasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })).filter(t => t.companyId === companyId);

  console.log('\n=== DEPENDENCY ANALYSIS ===\n');

  for (const depId of task.dependencies) {
    console.log(`\nDependency: ${depId}`);

    // Find the task by document ID or template ID
    const depTask = allTasks.find(t =>
      t.id === depId ||
      t.templateId === depId ||
      String(t.templateId) === depId
    );

    if (!depTask) {
      console.log('  ❌ Task not found');
      continue;
    }

    console.log('  ✅ Task found:');
    console.log('    ID:', depTask.id);
    console.log('    Name:', depTask.taskName);
    console.log('    Status:', depTask.status);
    console.log('    Phase:', depTask.phase);

    // Check chat messages for artifacts
    const chatRef = collection(db, 'taskChats', depTask.id, 'messages');
    const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
    const chatSnapshot = await getDocs(chatQuery);

    console.log('    Chat messages:', chatSnapshot.docs.length);

    // Look for artifact content in messages
    let foundArtifact = false;
    for (const msgDoc of chatSnapshot.docs) {
      const msg = msgDoc.data();
      if (msg.content && msg.content.includes('<artifact>')) {
        const artifactMatch = msg.content.match(/<artifact>([\s\S]*?)<\/artifact>/);
        if (artifactMatch && artifactMatch[1]) {
          foundArtifact = true;
          console.log('    📄 Artifact in chat:', artifactMatch[1].substring(0, 100).trim() + '...');
          console.log('       Length:', artifactMatch[1].length, 'characters');
          break;
        }
      }
    }

    if (!foundArtifact) {
      console.log('    ⚠️ No artifact found in chat messages');
    }

    // Check artifacts collection
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsSnapshot = await getDocs(artifactsRef);

    const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.taskId === depTask.id;
    });

    if (taskArtifacts.length > 0) {
      console.log('    📦 Artifacts in collection:', taskArtifacts.length);
      taskArtifacts.forEach(artDoc => {
        const art = artDoc.data();
        console.log('       -', art.name, `(${art.data?.length || 0} chars)`);
      });
    } else {
      console.log('    ⚠️ No artifacts in collection');
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Expected artifacts: ${task.dependencies.length}`);

  // Count how many dependencies have artifacts
  let artifactCount = 0;
  for (const depId of task.dependencies) {
    const depTask = allTasks.find(t =>
      t.id === depId ||
      t.templateId === depId ||
      String(t.templateId) === depId
    );

    if (!depTask) continue;

    const chatRef = collection(db, 'taskChats', depTask.id, 'messages');
    const chatSnapshot = await getDocs(chatRef);

    for (const msgDoc of chatSnapshot.docs) {
      const msg = msgDoc.data();
      if (msg.content && msg.content.includes('<artifact>')) {
        artifactCount++;
        break;
      }
    }
  }

  console.log(`Artifacts found: ${artifactCount}`);

  if (artifactCount < task.dependencies.length) {
    console.log('\n⚠️ PROBLEM: Some dependencies are missing artifacts!');
    console.log('This could be because:');
    console.log('1. The dependency tasks are not completed yet');
    console.log('2. The dependency tasks completed without generating artifacts');
    console.log('3. Artifacts were deleted during cleanup');
  } else {
    console.log('\n✅ All dependencies have artifacts');
  }
}

checkDependencyArtifacts()
  .then(() => {
    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
