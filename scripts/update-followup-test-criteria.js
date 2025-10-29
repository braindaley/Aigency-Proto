const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function updateFollowUpTestCriteria() {
  const templateId = 'XajTm0iTsvZX4RIXGmD6'; // Draft follow-up emails template

  console.log('Updating test criteria for "Draft follow-up emails" task...\n');

  const newTestCriteria = [
    'Follow-up email drafted for each carrier that received an original submission in the prior task',
    'Each email includes professional greeting addressing the carrier/underwriter',
    'Email references the original submission date and documents sent (ACORD 125, ACORD 130, loss runs, narrative)',
    'Email politely requests confirmation of receipt and expected timeline for quote response',
    'Email offers to provide additional information if needed',
    'Email includes proper closing with agent name, agency name, and contact information',
    'Professional insurance broker tone maintained throughout',
    'Email is brief and focused (3-4 paragraphs)',
    'Each email is personalized for the specific carrier',
    'Number of follow-up emails matches the number of carriers contacted in prior task',
    'No internal task metadata, system references, or workflow details included in email body',
    'Subject line clearly identifies this as a follow-up for the specific company'
  ];

  try {
    const templateRef = doc(db, 'tasks', templateId);
    await updateDoc(templateRef, {
      testCriteria: newTestCriteria
    });

    console.log('✅ Successfully updated test criteria\n');
    console.log('New test criteria:');
    newTestCriteria.forEach((criteria, index) => {
      console.log(`${index + 1}. ${criteria}`);
    });
  } catch (error) {
    console.error('❌ Error updating test criteria:', error);
  }
}

updateFollowUpTestCriteria().catch(console.error);
