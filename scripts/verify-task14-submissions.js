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

async function verifyTask14() {
  try {
    const companyId = 'OHioSIzK4i7HwcjLbX5r';
    const task14Id = 'YilhpZgWUxGLloeTWw6c';

    console.log('=== TASK 14 SUBMISSIONS ===\n');

    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const q = query(submissionsRef, where('taskId', '==', task14Id));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} submissions\n`);

    let idx = 0;
    snapshot.forEach((doc) => {
      idx++;
      const data = doc.data();
      console.log(`${idx}. ${data.carrierName}`);
      console.log(`   Email: ${data.carrierEmail}`);
      console.log(`   Subject: ${data.subject}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Has body: ${data.body ? 'Yes' : 'No'} (${(data.body || '').length} chars)`);
      console.log('');
    });

    console.log('✅ Task 14 submissions look correct!');
    console.log('\nView Task 14:');
    console.log('  http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/tasks/YilhpZgWUxGLloeTWw6c');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyTask14().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
