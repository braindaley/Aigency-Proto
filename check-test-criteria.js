/**
 * Check all task templates for testCriteria
 */

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

async function checkTemplates() {
  console.log('Checking task templates for testCriteria...\n');

  // Check tasks collection (this is where templates are stored)
  const templatesRef = collection(db, 'tasks');
  const templatesSnapshot = await getDocs(templatesRef);

  console.log(`Found ${templatesSnapshot.size} templates in tasks collection\n`);

  let withCriteria = 0;
  let withoutCriteria = 0;

  templatesSnapshot.forEach(doc => {
    const data = doc.data();
    const hasTestCriteria = !!data.testCriteria;

    if (hasTestCriteria) {
      withCriteria++;
    } else {
      withoutCriteria++;
    }

    console.log('---');
    console.log('Template ID:', doc.id);
    console.log('Task Name:', data.taskName || 'N/A');
    console.log('Policy Type:', data.policyType || 'N/A');
    console.log('Sort Order:', data.sortOrder || 'N/A');
    console.log('Has testCriteria:', hasTestCriteria ? '✅' : '❌');
    if (hasTestCriteria) {
      console.log('testCriteria preview:', data.testCriteria.substring(0, 150) + '...');
    }
    console.log('');
  });

  console.log('\n=== SUMMARY ===');
  console.log('Templates with testCriteria:', withCriteria);
  console.log('Templates without testCriteria:', withoutCriteria);
  console.log('Total templates:', templatesSnapshot.size);
}

checkTemplates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
