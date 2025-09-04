const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Web SDK
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test criteria for remaining tasks based on their names and inferred purposes
const additionalTestCriteriaMap = {
  // Tasks that weren't in original data but need test criteria
  '2aRwF5XPkonUUsCwmFwD': '• Underwriter has been notified of submission status or updates\n• Communication includes all relevant details and timeline\n• Appropriate contact method used (email, phone, portal)\n• Notification is professional and timely\n• Follow-up requirements documented',
  
  'ADPMxOtI43QsWM04mLc2': '• All submission documents archived in proper location\n• Files organized with consistent naming convention\n• Digital copies stored and backed up\n• Access permissions set appropriately\n• Retention schedule followed per company policy',
  
  'HbdglqOzgSyV17h2uqVk': '• Binder document sent to client and confirmed received\n• Invoice generated and sent with correct payment terms\n• Certificate of Insurance issued to all required parties\n• All documents contain accurate policy information\n• Delivery confirmation obtained from all recipients',
  
  'QoVPmyDnChgZfgcV9jh5': '• Proposal presentation completed with client\n• All questions answered satisfactorily\n• Client feedback documented\n• Next steps and timeline discussed\n• Meeting summary recorded for file',
  
  'RTalPzcj4knFPoqhuXjY': '• Binding confirmation received from selected carrier\n• All terms match the original quote and proposal\n• Policy number assigned and documented\n• Effective date confirmed\n• Any special conditions or requirements noted',
  
  'VWnjxJumSBvqA7arvTh1': '• Final policy documents reviewed for accuracy\n• Policy packet assembled with all required documents\n• Cover letter prepared explaining key terms\n• Policy delivered to client with confirmation\n• Client acknowledgment of receipt obtained',
  
  'deUYxwbfF1grLk786axH': '• Coverage differences between quotes clearly identified\n• Premium variations explained with reasons\n• Terms and conditions differences highlighted\n• Impact on client explained in plain language\n• Comparison organized for easy client understanding',
  
  'jtvyuPtMxk6LXHan0eht': '• Issued policy reviewed against binding terms\n• All coverage limits match binder\n• Premium calculations verified\n• Endorsements and exclusions confirmed\n• Any discrepancies flagged and resolved',
  
  'kUidJD8fbd0G1honXCL6': '• Invoice created with accurate premium amount\n• Payment terms and due date clearly stated\n• Proper billing address and contact information\n• Payment methods and instructions provided\n• Invoice format meets professional standards',
  
  'qFTvYoeIJzZ6mjS240c5': '• Policy documents filed in appropriate archive location\n• Digital copies stored with proper backup\n• File indexing completed for future retrieval\n• Access controls implemented\n• Archive retention schedule documented',
  
  'vlrXfB2Jyj9G72JOKSbY': '• All discrepancies between quote and policy resolved\n• Carrier corrections obtained in writing\n• Client notified of any changes from original terms\n• Updated documents issued as needed\n• Resolution documented in client file',
  
  'wsAcrTg46o4WbAtrOC8v': '• Certificate of Insurance generated with accurate information\n• Coverage details match bound policy\n• Certificate holder information verified\n• Additional insured language included where required\n• Certificate delivered to appropriate parties'
};

async function addRemainingTestCriteria() {
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('policyType', '==', 'workers-comp'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('No workers-comp tasks found.');
    return;
  }

  console.log(`Found ${snapshot.size} workers-comp tasks to check.`);

  const batch = writeBatch(db);
  let updateCount = 0;

  snapshot.forEach(docSnap => {
    const taskId = docSnap.id;
    const taskData = docSnap.data();
    
    // Only update tasks that don't already have test criteria and are in our additional map
    if ((!taskData.testCriteria || taskData.testCriteria === null) && additionalTestCriteriaMap[taskId]) {
      const testCriteria = additionalTestCriteriaMap[taskId];
      const taskDocRef = doc(db, 'tasks', taskId);
      batch.update(taskDocRef, { testCriteria });
      console.log(`Queued update for Task ${taskId} (${taskData.taskName})`);
      updateCount++;
    } else if (!taskData.testCriteria || taskData.testCriteria === null) {
      console.log(`No test criteria defined for Task ${taskId} (${taskData.taskName})`);
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`\nRemaining test criteria update complete. Updated ${updateCount} documents.`);
  } else {
    console.log('\nNo additional updates were needed.');
  }
}

addRemainingTestCriteria().catch(console.error);