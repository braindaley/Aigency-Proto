const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function checkDependencyArtifacts() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking dependency artifacts for Send submission packets task...\n');

  // Get the task
  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  const task = taskDoc.data();

  console.log('Task:', task.taskName);
  console.log('Dependencies:', task.dependencies);

  if (!task.dependencies || task.dependencies.length === 0) {
    console.log('No dependencies found');
    return;
  }

  // Get dependency tasks and their artifacts
  for (const depTemplateId of task.dependencies) {
    console.log('\n---');
    console.log('Dependency Template ID:', depTemplateId);

    // Find the company task for this template
    const tasksRef = collection(db, 'companyTasks');
    const tasksQuery = query(
      tasksRef,
      where('companyId', '==', companyId),
      where('templateId', '==', depTemplateId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);

    if (tasksSnapshot.empty) {
      console.log('  ⚠️  No company task found for template:', depTemplateId);
      continue;
    }

    const depTask = tasksSnapshot.docs[0];
    const depTaskData = depTask.data();
    console.log('  Task Name:', depTaskData.taskName);
    console.log('  Task ID:', depTask.id);

    // Get artifacts for this task
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQuery = query(artifactsRef, where('taskId', '==', depTask.id));
    const artifactsSnapshot = await getDocs(artifactsQuery);

    console.log(`  Artifacts: ${artifactsSnapshot.size}`);

    artifactsSnapshot.forEach((artifactDoc, idx) => {
      const data = artifactDoc.data();
      console.log(`\n  📄 Artifact ${idx + 1}:`);
      console.log('     Carrier Name:', data.carrierName || data.name);
      console.log('     Content preview (first 400 chars):');
      console.log('     ---');
      console.log('     ' + (data.data || '').substring(0, 400).replace(/\n/g, '\n     '));
      console.log('     ---');

      // Try to extract email
      const emailMatches = (data.data || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      console.log('     Emails found in content:', emailMatches || 'NONE');
    });
  }
}

checkDependencyArtifacts().catch(console.error);
