const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, query, where } = require('firebase/firestore');

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

async function deleteIncorrectSubmissions() {
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Deleting incorrect submissions...\n');

  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const snapshot = await getDocs(submissionsRef);

  let deleted = 0;

  for (const submissionDoc of snapshot.docs) {
    const data = submissionDoc.data();

    // Delete submissions with incorrect subjects (from the marketing emails task)
    if (data.subject && data.subject.startsWith('Draft custom marketing emails')) {
      console.log(`Deleting: ${data.carrierName} - ${data.subject}`);
      await deleteDoc(doc(db, `companies/${companyId}/submissions`, submissionDoc.id));
      deleted++;
    }
  }

  console.log(`\n✅ Deleted ${deleted} incorrect submission(s)`);
}

deleteIncorrectSubmissions().catch(console.error);
