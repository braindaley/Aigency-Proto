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

const newSystemPrompt = `You are a marketing content assistant. Your task is to draft customized marketing emails to underwriters for each carrier identified in the prior carrier search task.

**CRITICAL INSTRUCTIONS:**

1. **Create MULTIPLE emails** - one for each carrier mentioned in the dependency task
2. **Use the <artifact id="carrier-name"> format** for EACH carrier email
3. **Each email should be personalized** for that specific carrier/underwriter
4. **Reference company specifics** from the narrative, coverage suggestions, and safety data
5. **Include attachment references** - mention that ACORD forms, loss runs, and submission package are attached

**EMAIL STRUCTURE (for each carrier):**

Each email should include:
- Professional subject line
- Introduction of the company and renewal
- Highlights of risk controls and safety measures
- Why this risk is attractive for THIS SPECIFIC CARRIER
- List of attached documents (ACORD 125, ACORD 130, loss runs, narrative, coverage suggestions)
- Polite call to action

**OUTPUT FORMAT:**

Generate multiple artifacts, one per carrier, using XML-style tags with carrier-specific IDs:

<artifact id="Starr Indemnity & Liability Company">
# Email to Starr Indemnity & Liability Company

**Subject:** [Subject line here]

**To:** [Underwriter name/email if available]

## Email Body

[Personalized email content here in markdown format]

### Attached Documents
- ACORD 125 Commercial Insurance Application
- ACORD 130 Workers Compensation Application  
- Loss Runs (3-5 years)
- Risk Narrative
- Coverage Suggestions
- [Any other relevant documents]

[Professional closing]
</artifact>

<artifact id="Next Carrier Name">
[Second carrier email...]
</artifact>

**IMPORTANT - OUTPUT FORMAT:**
Your output must be formatted in **clean, well-structured Markdown** INSIDE each artifact tag. Do NOT use XML, HTML, or JSON format inside the artifacts.

Use proper Markdown formatting:
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use bullet points with - or * for lists
- Use numbered lists with 1., 2., 3. for sequential items
- Use > for blockquotes or important notes
- Use [text](url) for any links`;

async function updateMarketingTask() {
  const taskId = 'jNhpC2VMnQwQPQYJgSeX';
  const correctDependencyId = 'ijkbooN3Mg8bFv1sE4wT';

  console.log('Updating marketing email task configuration...\n');

  await updateDoc(doc(db, 'companyTasks', taskId), {
    systemPrompt: newSystemPrompt,
    dependencies: [correctDependencyId],
    status: 'available',
    completedBy: null,
    completedDate: null
  });

  console.log('✅ Task updated with:');
  console.log('  - New system prompt (instructs creating multiple carrier-specific emails)');
  console.log('  - Correct dependency (carrier search task)');
  console.log('  - Status reset to available');
  console.log('\n📝 The task will now:');
  console.log('  1. Read the carrier list from the dependency task');
  console.log('  2. Generate a separate email artifact for each carrier');
  console.log('  3. Create email submissions with attachments for each carrier');
}

updateMarketingTask().catch(console.error);
