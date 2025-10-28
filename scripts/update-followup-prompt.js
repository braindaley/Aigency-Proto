const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

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

async function updateFollowUpPrompt() {
  const taskId = 'GwnjdfTi1JOPGBcpPWot';

  console.log('Updating follow-up emails task prompt...\n');

  // Get current task
  const taskDoc = await getDoc(doc(db, 'companyTasks', taskId));
  const task = taskDoc.data();

  // Update system prompt to add explicit XML format instructions
  const updatedPrompt = task.systemPrompt + `

**CRITICAL XML FORMAT INSTRUCTIONS:**

DO NOT use an <artifacts> wrapper tag. Generate artifacts directly like this:

✅ CORRECT FORMAT:
<artifact id="carrier-name">
[email content here]
</artifact>

<artifact id="another-carrier">
[email content here]
</artifact>

❌ WRONG FORMAT (DO NOT USE):
<artifacts>
<artifact id="carrier-name">
[content]
</artifact>
</artifacts>

Each <artifact> tag should be separate and NOT wrapped in any parent tag.
Do NOT add name="" or type="" attributes to the artifact tag. Only use id="".`;

  await updateDoc(doc(db, 'companyTasks', taskId), {
    systemPrompt: updatedPrompt,
    status: 'available',
    completedBy: null,
    completedDate: null
  });

  console.log('✅ Task prompt updated with explicit XML format instructions');
  console.log('✅ Task status reset to available');
}

updateFollowUpPrompt().catch(console.error);
