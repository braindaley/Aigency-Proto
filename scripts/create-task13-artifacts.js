const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs, Timestamp } = require('firebase/firestore');

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

async function createTask13Artifacts() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';
  const task13Id = 'GwnjdfTi1JOPGBcpPWot';
  const task12Id = 'RARYeXVoPmu7Vu8YI9Ba';

  console.log('=== CREATING TASK 13 FOLLOW-UP EMAIL ARTIFACTS ===\n');

  // Get the carriers from Task 12's submissions
  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef, where('taskId', '==', task12Id));
  const snapshot = await getDocs(q);

  const carriers = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    carriers.push({
      name: data.carrierName,
      email: data.carrierEmail
    });
  });

  console.log(`Found ${carriers.length} carriers from Task 12:\n`);
  carriers.forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.name} (${c.email})`);
  });

  console.log('\n Creating follow-up email artifacts...\n');

  const now = Timestamp.now();
  const artifactsRef = collection(db, `companies/${companyId}/artifacts`);

  for (let i = 0; i < carriers.length; i++) {
    const carrier = carriers[i];

    const artifactData = {
      artifactId: carrier.name,
      taskName: 'Draft follow-up emails',
      artifactIndex: i,
      updatedAt: now,
      renewalType: 'workers-comp',
      totalArtifacts: carriers.length,
      name: carrier.name,
      createdAt: now,
      description: `AI-generated artifact for task: Draft follow-up emails - ${carrier.name}`,
      type: 'text',
      tags: ['Marketing', 'ai', 'ai-canvas', 'ai-generated', 'auto-saved', 'multi-artifact'],
      taskId: task13Id,
      data: `# Follow-Up Email to ${carrier.name}

**Subject:** Follow-up: Workers' Compensation Submission for TWR Enterprises, Inc.

**To:** ${carrier.email}

## Email Body

Dear [Underwriter Name],

I wanted to follow up on the Workers' Compensation submission we sent for **TWR Enterprises, Inc.** on [Date - 3 days ago]. The submission included:

- ACORD 125 Commercial Insurance Application
- ACORD 130 Workers' Compensation Application
- 5-year loss runs
- Risk narrative
- Coverage recommendations

Could you please confirm receipt and provide an estimated timeline for your quote response? If you need any additional information or clarification, please don't hesitate to reach out.

I look forward to hearing from you soon.

Best regards,

Brian Daley
GoldenComm
Email: bdaley@goldencomm.com
Phone: 949-574-5500`
    };

    await addDoc(artifactsRef, artifactData);
    console.log(`✅ Created artifact ${i + 1}: ${carrier.name}`);
  }

  console.log(`\n✅ Successfully created ${carriers.length} follow-up email artifacts for Task 13!`);
  console.log('\nNow open Task 13 to view the follow-up emails:');
  console.log('  http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/tasks/GwnjdfTi1JOPGBcpPWot');
}

createTask13Artifacts().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
