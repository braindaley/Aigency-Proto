const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function fixSubmissionSubjects() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Fixing submission subject lines...\n');

  // Get all submissions for this task
  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} submissions to check\n`);

  let updated = 0;
  let skipped = 0;

  for (const submissionDoc of snapshot.docs) {
    const submission = submissionDoc.data();
    const currentSubject = submission.subject;
    const body = submission.body || '';

    // Extract the subject from the body content
    const subjectMatch = body.match(/\*\*Subject:\*\*\s*(.+?)(?:\n|$)/i);

    if (subjectMatch) {
      const correctSubject = subjectMatch[1].trim();

      if (correctSubject !== currentSubject) {
        console.log(`✏️  ${submission.carrierName}:`);
        console.log(`   Old: ${currentSubject}`);
        console.log(`   New: ${correctSubject}`);

        await updateDoc(doc(db, `companies/${companyId}/submissions`, submissionDoc.id), {
          subject: correctSubject
        });
        updated++;
      } else {
        console.log(`✅ ${submission.carrierName}: Subject already correct`);
        skipped++;
      }
    } else {
      console.log(`⚠️  ${submission.carrierName}: No subject found in body, keeping current: ${currentSubject}`);
      skipped++;
    }
  }

  console.log(`\n---`);
  console.log(`✅ Updated ${updated} submission(s)`);
  console.log(`⏭️  Skipped ${skipped} submission(s)`);
}

fixSubmissionSubjects().catch(console.error);
