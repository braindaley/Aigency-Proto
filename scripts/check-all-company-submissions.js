const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkAllSubmissions() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Checking ALL submissions for company...\n');

  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const snapshot = await getDocs(submissionsRef);

  console.log(`Found ${snapshot.size} total submissions\n`);

  // Group by carrier
  const byCarrier = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const carrier = data.carrierName || 'Unknown';

    if (!byCarrier[carrier]) {
      byCarrier[carrier] = [];
    }

    byCarrier[carrier].push({
      id: doc.id,
      taskId: data.taskId,
      taskName: data.taskName,
      subject: data.subject,
      status: data.status
    });
  });

  Object.entries(byCarrier).forEach(([carrier, submissions]) => {
    console.log(`\n${carrier} (${submissions.length} submissions):`);
    submissions.forEach((sub, idx) => {
      console.log(`  ${idx + 1}. ${sub.taskName}`);
      console.log(`     Subject: ${sub.subject}`);
      console.log(`     Status: ${sub.status}`);
    });
  });
}

checkAllSubmissions().catch(console.error);
