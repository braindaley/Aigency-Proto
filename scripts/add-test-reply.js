const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, arrayUnion, Timestamp } = require('firebase/firestore');

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

async function addTestReply() {
  const companyId = 'qsu1QXPB8TUK2P4QyDiy';

  console.log('\n=== Adding test underwriter reply ===\n');

  // Get a submission from Task 12
  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef);
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('❌ No submissions found');
    process.exit(1);
  }

  // Get the first submission (Starr)
  const firstSubmission = snapshot.docs[0];
  const submissionData = firstSubmission.data();

  console.log(`Found submission: ${submissionData.carrierName}`);
  console.log(`  ID: ${firstSubmission.id}`);
  console.log(`  Contact: ${submissionData.contactEmail}`);

  // Add a reply
  const reply = {
    from: submissionData.contactEmail,
    fromName: `${submissionData.carrierName} Underwriter`,
    receivedAt: Timestamp.now(),
    subject: `RE: Workers' Compensation Submission`,
    body: `Can you provide more details on the safety training program for the framing crews? Specifically, what type of fall protection training is provided and how often is it conducted?`,
    bodyHtml: `<p>Can you provide more details on the safety training program for the framing crews? Specifically, what type of fall protection training is provided and how often is it conducted?</p>`,
    attachments: [],
    responded: false
  };

  const submissionRef = doc(db, `companies/${companyId}/submissions`, firstSubmission.id);
  await updateDoc(submissionRef, {
    replies: arrayUnion(reply),
    status: 'replied',
    lastReplyAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  console.log('\n✅ Test reply added successfully!');
  console.log(`\nView Task 15 at: http://localhost:9002/companies/${companyId}/tasks/6dTS66SI7Z5kdX3cO8I9`);

  process.exit(0);
}

addTestReply().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
