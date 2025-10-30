const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAcz7kZJH4Jb8TEnzBIgQI3r5gxEZP_dKI",
  authDomain: "aigency-proto.firebaseapp.com",
  projectId: "aigency-proto",
  storageBucket: "aigency-proto.firebasestorage.app",
  messagingSenderId: "1066649353387",
  appId: "1:1066649353387:web:3a8e71d32f3c33b3b82b23"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newSystemPrompt = `# ACORD 125 Commercial Insurance Application Completion

## Your Task:
Extract information from the provided company documents and complete an ACORD 125 Commercial Insurance Application in a professional, well-formatted markdown document.

## Instructions:
1. Review all available company documents, artifacts, and prior insurance information
2. Extract relevant data for each section of the ACORD 125 form
3. Present the information in a clear, organized markdown format
4. Use tables for structured data where appropriate
5. Ensure all sections are complete and professional

## Output Format:
Create a well-formatted markdown document with the following sections:

### GENERAL INFORMATION
- Applicant name, DBA, addresses
- Contact information
- Business structure, FEIN
- Years in business
- SIC/NAICS codes

### BUSINESS INFORMATION
- Primary operations description
- Products/services
- Geographic territory
- Revenue information
- Related entities

### COVERAGE REQUESTS
For each coverage line (General Liability, Property, Auto, Umbrella):
- Coverage limits
- Deductibles
- Special coverages or endorsements

### PRIOR INSURANCE HISTORY
- 5-year carrier history with policy details
- Claims history summary
- Premium history

### LOSS CONTROL & SAFETY
- Safety programs
- Training programs
- Certifications
- Recent improvements

Use professional formatting with clear section headers, tables for tabular data, and bullet points for lists. Make the document ready for carrier submission.`;

async function updateTemplate() {
  console.log('🔧 Updating ACORD 125 template...\n');

  // Find the template in the tasks collection
  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, where('taskName', '==', 'Complete ACORD 125 – Commercial Insurance Application'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('❌ Template not found');
    return;
  }

  const templateDoc = snapshot.docs[0];
  console.log('📋 Found template:', templateDoc.id);

  // Update the system prompt
  await updateDoc(templateDoc.ref, {
    systemPrompt: newSystemPrompt
  });

  console.log('✅ Template updated successfully');

  // Also update the task instance
  const companyTasksRef = collection(db, 'companyTasks');
  const instanceQuery = query(companyTasksRef, where('taskName', '==', 'Complete ACORD 125 – Commercial Insurance Application'));
  const instanceSnapshot = await getDocs(instanceQuery);

  console.log(`\n📝 Found ${instanceSnapshot.size} task instances`);

  for (const doc of instanceSnapshot.docs) {
    await updateDoc(doc.ref, {
      systemPrompt: newSystemPrompt
    });
    console.log(`   ✅ Updated task instance: ${doc.id}`);
  }
}

updateTemplate()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
