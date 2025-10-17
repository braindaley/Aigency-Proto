const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB3XlnTBdVIZe8h32wU9OtXvkDv0c-F1t8",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1076469562302",
  appId: "1:1076469562302:web:09a7fb81a51a1d0c3c0c11"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCompany() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';

  console.log('Checking company:', companyId);

  const companyRef = doc(db, 'companies', companyId);
  const companySnap = await getDoc(companyRef);

  if (companySnap.exists()) {
    console.log('\n=== Company Found ===');
    console.log('Name:', companySnap.data().name);
    console.log('Created At:', companySnap.data().createdAt?.toDate?.());
  } else {
    console.log('Company not found');
  }

  // Try to list root-level collections
  console.log('\n=== Checking Collection Structure ===');

  // Check if there are any companies
  const companiesRef = collection(db, 'companies');
  const companiesSnapshot = await getDocs(companiesRef);
  console.log('Total companies found:', companiesSnapshot.docs.length);

  if (companiesSnapshot.docs.length > 0) {
    console.log('\nFirst few companies:');
    companiesSnapshot.docs.slice(0, 5).forEach(doc => {
      console.log('-', doc.id, ':', doc.data().name || 'No name');
    });
  }

  process.exit(0);
}

checkCompany().catch(console.error);
