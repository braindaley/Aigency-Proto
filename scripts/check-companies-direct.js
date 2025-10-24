/**
 * Direct check of companies collection
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCzT_CU_bVIWcxU7p9-gPTI-QbFHqGJj5s",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1072219612856",
  appId: "1:1072219612856:web:c6fccfd12a47e79b37cb49",
  measurementId: "G-J5XPQRJ0RZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCompanies() {
  console.log('🔍 Checking companies collection...\n');

  const companiesSnapshot = await getDocs(collection(db, 'companies'));
  console.log(`Found ${companiesSnapshot.size} companies`);

  if (companiesSnapshot.size > 0) {
    console.log('\nCompany details:');
    companiesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\n  ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Created: ${data.createdAt?.toDate?.() || 'unknown'}`);
    });
  } else {
    console.log('\n✅ Companies collection is empty (as expected)');
  }
}

checkCompanies()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
