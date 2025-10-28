const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkSubmissions() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking created email submissions...\n');

  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} submissions:\n`);

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`📧 Submission: ${doc.id}`);
    console.log(`   Carrier: ${data.carrierName}`);
    console.log(`   Subject: ${data.subject}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Attachments: ${(data.attachments || []).length}`);
    if (data.attachments && data.attachments.length > 0) {
      console.log(`   📎 Attachment List:`);
      data.attachments.forEach((att, i) => {
        console.log(`      ${i + 1}. ${att.name || att.fileName}`);
      });
    } else {
      console.log(`   ⚠️  No attachments found`);
    }
    console.log('');
  });
}

checkSubmissions().catch(console.error);
