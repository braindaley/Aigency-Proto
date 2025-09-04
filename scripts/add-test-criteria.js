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

// Test criteria for each task based on descriptions and system prompts
const testCriteriaMap = {
  'Q41BkK5qUnMaZ0waRRla': '• Employee count data has been collected and documented\n• Job descriptions for all roles have been gathered\n• High-risk roles have been specifically identified and documented\n• Information is sufficient for ACORD 130 completion\n• All requested data matches the format required for carrier submission',
  
  'RQlrE8SxH5S1Dmz9Fcep': '• Payroll data is broken down by specific classification codes\n• All classification codes are accurate and current\n• Payroll amounts have been verified for accuracy\n• Data format is suitable for ACORD 125 and ACORD 130 forms\n• No missing or incomplete payroll classifications',
  
  'Yc1t3K3v5Rj3SMoGMhlu': '• 3-5 years of complete loss runs have been obtained\n• Loss runs are verified and official from carriers\n• No gaps or missing years in the loss history\n• Loss runs are in acceptable format for carrier submission\n• All loss runs are current and up-to-date',
  
  'vJmLwiZom1tIJZTL3uAG': '• OSHA database search has been conducted with relevant results\n• Company website and public sources have been researched\n• Safety record and incident data has been documented\n• Compliance information has been gathered and summarized\n• Research findings are organized in bullet points with references\n• Information is relevant for insurance underwriting purposes',
  
  'qMkNQITF8u7nvts7troM': '• ACORD 130 form is completely filled out with all required sections\n• Classification codes accurately match business operations\n• Payroll data is correctly allocated by classification\n• Experience modification factors are accurate and current\n• All applicant information is complete and verified\n• Form meets carrier submission standards and requirements',
  
  'Z1YTH2FkhrcrAnvyvu1H': '• ACORD 125 form is completely filled out with all required sections\n• General information section contains accurate business details\n• Coverage requests match client needs and industry standards\n• Prior insurance history is complete and accurate\n• Loss control information is documented\n• Form meets carrier submission requirements',
  
  'm08S186qdxKgnxZ32cGH': '• Narrative clearly explains insured\'s operations\n• Risk controls and safety measures are highlighted\n• Company strengths are presented persuasively\n• Narrative is concise (under 500 words)\n• Content is professionally written and carrier-ready\n• Information aligns with ACORD forms and supporting documents',
  
  'JIwJvXLzaoEiZx09UfiN': '• Coverage recommendations are tailored to client\'s specific exposures\n• Mandatory Workers\' Compensation coverage is included\n• Industry-appropriate endorsements are suggested\n• Optional coverages that reduce risk exposure are identified\n• Rationale for each recommendation is clearly provided\n• Recommendations are presented in broker-ready format',
  
  'uAqsk1Hcbzerb6oriO49': '• All forms have been reviewed for completeness and accuracy\n• Narratives align with form data\n• Coverage recommendations are consistent with client needs\n• No discrepancies between different submission documents\n• Package is ready for carrier submission\n• Quality control checklist has been completed',
  
  'sKY8AVp6hj3pqZ957KTT': '• Carriers with strong appetite for client\'s industry have been identified\n• State-specific carrier preferences have been researched\n• Carriers with competitive WC programs have been prioritized\n• Carrier selection aligns with client profile and risk characteristics\n• Adequate number of carriers identified for competitive market\n• Carrier financial strength and service record considered',
  
  'tgKQBvbrpPeYoUALo85d': '• Marketing emails are personalized for each carrier/underwriter\n• Industry insights and specific risk characteristics are referenced\n• Content avoids generic mass email language\n• Professional and engaging tone is maintained\n• Email content highlights company strengths and risk controls\n• Clear call to action is included',
  
  'xSlP5LJa24ZxHpX8q4pi': '• Complete submission packets prepared for each carrier\n• All required forms and attachments are included\n• Documents are organized in logical order\n• Email template includes proper subject line\n• All attachments are described in email body\n• Professional closing and contact information included',
  
  'XajTm0iTsvZX4RIXGmD6': '• Follow-up communications sent to all carriers within 48 hours\n• Confirmation of receipt obtained from each carrier\n• Timestamps and responses logged for accountability\n• Follow-up schedule established for pending responses\n• Contact information verified and updated\n• Tracking system updated with submission status',
  
  'tpY2p3fHch0dG7SmF5jA': '• All underwriter questions reviewed and understood\n• Responses are complete and professionally written\n• Answers reference appropriate source documents\n• Tone is collaborative and positions client positively\n• Technical accuracy verified before sending\n• Response timeline meets underwriter expectations',
  
  'HfL4Mz2WNC1Qxz8nJm1D': '• All submissions logged in CRM or tracking system\n• Entry includes dates, carrier names, and contact information\n• Documents included in each submission are listed\n• Confirmation status is tracked for each submission\n• Data is in consistent, searchable format\n• Log is accessible to team members as needed',
  
  'bwitwASxd2J6yZIqR3Gx': '• Response tracking system established for all submissions\n• Follow-up reminders scheduled at appropriate intervals\n• Declinations and reasons documented\n• Open items and pending requirements tracked\n• Status updates provided to client as appropriate\n• Nothing falls through cracks - all submissions monitored',
  
  'JKPU7vMbdFx6TgmgusTZ': '• All carrier quotes ingested into comparison system\n• Quote formats standardized for easier comparison\n• Key data fields extracted (premium, mod, endorsements, exclusions)\n• Data consistency validated against original submission\n• Quote information organized in structured format\n• All received quotes accounted for and processed',
  
  'mKFa80ozOmPqzL31t5Ht': '• Rates compared across all carriers\n• Experience modification factors analyzed\n• Endorsements compared side-by-side\n• Coverage differences clearly identified\n• Cost variations explained and justified\n• Comparison presented in clear, organized format',
  
  'GL3jXHzN9a89cORYMs03': '• All discrepancies in coverage terms identified\n• Differences in limits and exclusions flagged\n• Endorsement variations documented\n• Priority level assigned to each discrepancy (High/Medium/Low)\n• Impact on coverage explained\n• Issues ready for client discussion',
  
  'F76TpvEEeCfl64Qv7FDU': '• Side-by-side comparison sheet created\n• Format is client-friendly and easy to understand\n• All key factors included (carrier, premium, mod, endorsements)\n• Visual layout is clear and professional\n• Information is accurate and complete\n• Sheet is ready for client presentation',
  
  'eH4AEtq0w4FJLx6iWKaa': '• Recommendation balances cost, coverage, and carrier strength\n• Trade-offs between options clearly explained\n• Rationale for broker recommendation provided\n• Client-specific factors considered\n• Professional presentation format\n• Recommendation aligns with client\'s risk tolerance and budget',
  
  'eh55Ns61e28vWXW5Vvij': '• Loss forecast created based on historical data\n• Trend analysis shows methodology and assumptions\n• 12-month projection includes confidence intervals\n• Impact on premium calculations explained\n• Forecast presented in clear table format\n• Client expectations on pricing appropriately set',
  
  '6TpwwqR0btGKwruEhxEX': '• Proposal packaged with consistent branding\n• Professional formatting and clean layout\n• All components integrated (narrative, comparison, recommendation, forecasts)\n• Easy to read and navigate\n• Ready for client presentation\n• Meets professional standards for insurance proposals',
  
  'MsECH4p7qL6ZVBrN2OTt': '• Client presentation meeting scheduled\n• Calendar invites sent with agenda\n• Meeting duration appropriate for proposal complexity\n• Required attendees identified and invited\n• Prep materials sent in advance\n• Logistics confirmed (location, technology, materials)',
  
  '7nKfMlNGzIxRwZ8cU1vV': '• Presentation outline prepared with clear talking points\n• Coverage differences and premium justifications ready to explain\n• Q&A preparation completed for anticipated questions\n• Visual aids and handouts prepared\n• Presenter familiar with all aspects of proposal\n• Meeting objectives clearly defined',
  
  'OqYLWXzKbGhP5mA3RjFs': '• Client decision documented with reasoning\n• Selected carrier and terms recorded\n• Alternative options considered are noted\n• Any special negotiated terms documented\n• Decision rationale captured for future reference\n• File updated with complete selection record',
  
  '2HbvK9mJ1EpQaSrTcXdY': '• Selected carrier contacted for quote confirmation\n• All terms verified to match proposal (premium, limits, endorsements)\n• Effective dates and policy period confirmed\n• Any rate changes or updates identified\n• Written confirmation obtained from carrier\n• Terms remain valid and binding',
  
  'iVyBnGhK8fDlM6oWzPqR': '• Formal binder request submitted to carrier\n• All confirmed terms included in binding request\n• Effective dates and payment details specified\n• Certificate requirements communicated\n• Binding commitment received from carrier\n• Policy number assigned and documented',
  
  'uHgJkLpN3qRsTvXzAcBw': '• Policy documents received and reviewed against binder terms\n• Classifications match bound coverage\n• Limits and endorsements verified\n• Premium calculations checked for accuracy\n• Effective dates confirmed\n• Any discrepancies flagged for carrier correction',
  
  '4CdEfGhI9jKlMnOpQrSt': '• First payment invoice generated and sent to client\n• Payment amount matches binder terms\n• Payment terms and due dates clearly specified\n• Payment methods and instructions provided\n• Payment received and processed\n• Receipt provided to client',
  
  '8UvWxYz2AbCdEfGhIjKl': '• Certificates issued to all required parties\n• Coverage details match bound policy terms\n• Certificate holders list verified and complete\n• Additional insured language included where required\n• Certificates delivered to appropriate parties\n• Certificate tracking system updated',
  
  'MnOpQrSt5UvWxYzAbCdE': '• Complete policy packet prepared with all documents\n• Cover letter explains key policy terms\n• Important dates and deadlines highlighted\n• Certificate process and contact information provided\n• Next steps clearly communicated\n• Package delivered to client with confirmation of receipt',
  
  'FgHiJkLm9NoPqRsTuVwX': '• Renewal reminders set in calendar system\n• Reminders scheduled at 120, 90, 60, and 30 days before expiration\n• Key policy information included in reminders\n• Preliminary renewal checklist prepared\n• Renewal timeline established\n• Contact information verified for renewal process',
  
  'YzAbCdEf3GhIjKlMnOpQ': '• Mid-term review meeting scheduled (6 months after effective date)\n• Review agenda prepared covering business changes and claims\n• Payroll updates and safety program review planned\n• Coverage adequacy assessment scheduled\n• Client calendar coordinated for meeting\n• Review objectives and outcomes defined',
  
  'RsTuVwXy7ZaBcDeFgHiJ': '• Claims tracking system established\n• Claim reporting procedures documented\n• Carrier contacts and communication protocols in place\n• Regular review intervals scheduled\n• Client update procedures established\n• Claims files maintained throughout policy period'
};

async function addTestCriteria() {
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('policyType', '==', 'workers-comp'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('No workers-comp tasks found.');
    return;
  }

  console.log(`Found ${snapshot.size} workers-comp tasks to update.`);

  const batch = writeBatch(db);
  let updateCount = 0;

  snapshot.forEach(docSnap => {
    const taskId = docSnap.id;
    const taskData = docSnap.data();
    const testCriteria = testCriteriaMap[taskId];
    
    if (testCriteria) {
      const taskDocRef = doc(db, 'tasks', taskId);
      batch.update(taskDocRef, { testCriteria });
      console.log(`Queued update for Task ${taskId} (${taskData.taskName})`);
      updateCount++;
    } else {
      console.log(`No test criteria found for Task ${taskId} (${taskData.taskName})`);
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`\nTest criteria update complete. Updated ${updateCount} documents.`);
  } else {
    console.log('\nNo updates were made.');
  }
}

addTestCriteria().catch(console.error);