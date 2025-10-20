const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkTask12Submissions() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const task12Id = 'TTilYNj1zMNpdKnEzDNg'; // Task 12 - Send submission packets

  console.log('\n=== Task 12: Send submission packets ===');
  console.log('Checking submissions...\n');

  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef, where('taskId', '==', task12Id));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} submissions\n`);

  const carriers = [];
  snapshot.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`Submission ${idx + 1}:`);
    console.log(`  Carrier: ${data.carrierName}`);
    console.log(`  Email: ${data.carrierEmail}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Created: ${data.createdAt?.toDate?.()}\n`);
    carriers.push(data.carrierName);
  });

  console.log(`\nCarriers that received submissions (${carriers.length}):`);
  carriers.forEach((carrier, idx) => {
    console.log(`  ${idx + 1}. ${carrier}`);
  });

  process.exit(0);
}

checkTask12Submissions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
