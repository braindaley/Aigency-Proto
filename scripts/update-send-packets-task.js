const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

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

const templateId = 'xSlP5LJa24ZxHpX8q4pi'; // Send submission packets

const systemPrompt = `# Send Submission Packets

## Your Task
Create individual, carrier-specific submission emails for EACH carrier identified in the "Identify suitable carriers for WC" dependency task. Each email should be tailored to that specific carrier's requirements, appetite, and relationship with the account.

## CRITICAL: Generate Multiple Carrier-Specific Emails

You MUST:
1. Review the carrier research artifact to identify ALL recommended carriers
2. Generate a SEPARATE email for EACH carrier (5-7 emails typically)
3. Format the output as multiple artifacts, one per carrier

## Output Format

Generate your response as MULTIPLE artifacts, each containing one carrier-specific email:

<artifact id="carrier-1" title="Submission Email - [Carrier Name]">
[Email content for first carrier]
</artifact>

<artifact id="carrier-2" title="Submission Email - [Carrier Name]">
[Email content for second carrier]
</artifact>

... continue for each carrier ...

## Email Content Structure

Each carrier-specific email should include:

### Subject Line
Format: "Workers' Comp [Renewal/New Business] Submission: [Client Name] - [Industry] (Eff. [Date])"

### Opening
- Personalize to the carrier/underwriter if known
- Reference any existing relationship or previous quotes

### Client Introduction
- Company name and brief description
- Highlight strengths that match THIS carrier's appetite
- Emphasize factors from carrier research that make this a good fit for THIS specific carrier

### Why This Carrier
**IMPORTANT**: Explain why THIS carrier was selected based on the research:
- Specific appetite match (industry, state, size)
- Programs offered that align with client needs
- Competitive advantages for this risk
- Reference insights from the carrier research

### Risk Profile Summary
- Experience mod and context
- Loss history summary with explanations
- Safety programs and risk management
- Financial strength/captive information if applicable

### Attached Documents List
List all documents in the submission package (from dependency artifacts):
- ACORD 130
- ACORD 125  
- Narratives
- Loss runs
- Payroll breakdown
- Experience mod worksheet
- Any other supporting documents

### Specific Carrier Requirements
**IMPORTANT**: List any carrier-specific submission requirements identified in the research:
- Special forms this carrier requires
- Preferred submission format
- Additional documentation needed
- Underwriter contacts if known

### Call to Action
- Request quote/indication
- Mention timeline/effective date
- Offer to provide additional information
- Suggest follow-up call if appropriate

### Signature
Use agency information from context (agency name, contact name, phone, email)

## Email Quality Standards

Each email must:
- Use the carrier's actual name throughout
- Reference specific details from the carrier research (appetite, programs, ratings)
- Explain why THIS carrier is a good fit based on research findings
- Include carrier-specific submission requirements
- Maintain professional, personalized tone
- Be ready to send without placeholders

## Example Structure

**GOOD (Carrier-Specific)**:
"We are pleased to submit TWR Enterprises for your consideration. Based on Arch's strong Middle Market Construction appetite and focus on risk control, we believe this account aligns well with your target market. TWR's dedicated Risk & Safety Manager and comprehensive safety programs should appeal to Arch's underwriting approach..."

**POOR (Generic)**:
"We are pleased to submit this account for your consideration. The client has good safety programs..."

The good example specifically references Arch's known appetites and positions the account accordingly.
`;

const testCriteria = `• Generated separate email for each carrier identified in carrier research (minimum 5 carriers)
• Each email is carrier-specific, not generic (references carrier name, appetite, programs)
• Emails explain why each carrier was selected based on research findings
• Client profile accurately reflects submission package data
• Each email lists all submission documents being sent
• Carrier-specific submission requirements included where applicable
• Professional tone appropriate for underwriter communication
• Agency contact information included in signature
• No placeholder text or generic statements
• Emails are ready to send without additional editing`;

async function updateTask() {
  console.log('=== UPDATING SEND SUBMISSION PACKETS TASK ===\n');
  
  const taskRef = doc(db, 'tasks', templateId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    console.log('ERROR: Template not found');
    return;
  }
  
  console.log('Current template:', taskDoc.data().taskName);
  
  await updateDoc(taskRef, {
    systemPrompt,
    testCriteria,
    updatedAt: new Date().toISOString()
  });
  
  console.log('\nTask template updated successfully!');
  console.log('- System Prompt:', systemPrompt.length, 'characters');
  console.log('- Test Criteria:', testCriteria.length, 'characters');
  console.log('\nKey changes:');
  console.log('- Now generates MULTIPLE carrier-specific emails');
  console.log('- Each email tailored to specific carrier from research');
  console.log('- Uses multiple artifact format for navigation');
}

updateTask()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
