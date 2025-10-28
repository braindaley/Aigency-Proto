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

/**
 * Extract carrier email from email body content using improved logic
 */
function extractCarrierEmail(content) {
  // First try to find email in "To:" line (preferred)
  const toLineMatch = content.match(/\*\*To:\*\*\s*(?:[^\n]*?[-–]\s*)?(?:[^\n]*?,\s*)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (toLineMatch) return toLineMatch[1];

  // Look for email in "Dear" line
  const dearMatch = content.match(/Dear\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (dearMatch) return dearMatch[1];

  // Look for any email address in content but filter out known sender emails
  const allEmails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const senderEmails = ['bdaley@goldencomm.com', 'submissions@orionrisk.com', 'noreply@', 'donotreply@'];
  const carrierEmail = allEmails.find(email =>
    !senderEmails.some(sender => email.toLowerCase().includes(sender.toLowerCase()))
  );

  return carrierEmail || null;
}

async function fixSubmissionEmails() {
  const taskId = 'RARYeXVoPmu7Vu8YI9Ba';
  const companyId = 'OHioSIzK4i7HwcjLbX5r';

  console.log('Fixing submission email addresses...\n');

  // Get all submissions for this task
  const submissionsRef = collection(db, `companies/${companyId}/submissions`);
  const q = query(submissionsRef, where('taskId', '==', taskId));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} submissions to check\n`);

  let updated = 0;
  let skipped = 0;

  for (const submissionDoc of snapshot.docs) {
    const submission = submissionDoc.data();
    const currentEmail = submission.carrierEmail;
    const body = submission.body || '';

    // Extract the correct email from the body
    const correctEmail = extractCarrierEmail(body);

    if (!correctEmail) {
      // Generate placeholder based on carrier name
      const placeholder = `underwriter@${(submission.carrierName || 'carrier').toLowerCase().replace(/\s+/g, '')}.com`;
      console.log(`⚠️  ${submission.carrierName}:`);
      console.log(`   Current: ${currentEmail}`);
      console.log(`   No email found in body, using placeholder: ${placeholder}`);

      await updateDoc(doc(db, `companies/${companyId}/submissions`, submissionDoc.id), {
        carrierEmail: placeholder
      });
      updated++;
    } else if (correctEmail !== currentEmail) {
      console.log(`✏️  ${submission.carrierName}:`);
      console.log(`   Old: ${currentEmail}`);
      console.log(`   New: ${correctEmail}`);

      await updateDoc(doc(db, `companies/${companyId}/submissions`, submissionDoc.id), {
        carrierEmail: correctEmail
      });
      updated++;
    } else {
      console.log(`✅ ${submission.carrierName}: ${currentEmail} (already correct)`);
      skipped++;
    }
  }

  console.log(`\n---`);
  console.log(`✅ Fixed ${updated} submission(s)`);
  console.log(`⏭️  Skipped ${skipped} submission(s) (already correct)`);
}

fixSubmissionEmails().catch(console.error);
