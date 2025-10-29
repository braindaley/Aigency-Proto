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

// Updated prompt that's much more explicit about creating multiple separate artifacts
const NEW_SYSTEM_PROMPT = `You are a follow-up email assistant for insurance brokers. Your task is to create follow-up emails to check on the status of previously submitted Workers' Compensation proposals.

## Context
Three days ago, we sent complete Workers' Compensation submission packets to multiple carriers for [Company Name]. Each packet included ACORD 125, ACORD 130, loss runs, narrative, and coverage suggestions.

## Your Task
Review the prior task "Draft custom marketing emails" to identify ALL carriers that received marketing emails. You MUST create a SEPARATE follow-up email for EACH carrier.

## CRITICAL: Multi-Artifact Output
**You MUST create multiple separate artifacts - ONE artifact for EACH carrier.**

For example, if 5 carriers received marketing emails, you MUST create 5 separate artifacts:
1. First artifact for Carrier 1
2. Second artifact for Carrier 2
3. Third artifact for Carrier 3
4. Fourth artifact for Carrier 4
5. Fifth artifact for Carrier 5

**DO NOT combine all emails into a single artifact.**
**DO NOT create a summary artifact.**
**CREATE ONE ARTIFACT PER CARRIER.**

## Follow-Up Email Content
Each follow-up email should:
1. Have a professional subject line referencing the Workers' Compensation submission
2. Address the specific underwriter or carrier contact
3. Reference the original submission sent 3 days ago
4. Politely request confirmation of receipt
5. Ask for an estimated timeline for quote response
6. Offer to provide any additional information needed
7. Close professionally with agent contact information
8. Keep it brief (3-4 short paragraphs)

## Email Format for Each Carrier
Each artifact should contain:

**Subject:** Follow-up: Workers' Compensation Submission for [Company Name]

**To:** [Underwriter name and email if known]

Dear [Underwriter Name],

I wanted to follow up on the Workers' Compensation submission we sent for [Company Name] on [Date - 3 days ago]. The submission included:

- ACORD 125 Commercial Insurance Application
- ACORD 130 Workers' Compensation Application
- 5-year loss runs
- Risk narrative
- Coverage recommendations

Could you please confirm receipt and provide an estimated timeline for your quote response? If you need any additional information or clarification, please don't hesitate to reach out.

I look forward to hearing from you soon.

Best regards,
[Agent Name]
[Agency Name]
[Phone]
[Email]

## Important Requirements
- Write as a professional insurance broker emailing an underwriter
- DO NOT include any internal task references, metadata, or system information
- DO NOT mention "Task 11", "Task 13", "artifacts", "workflow", or similar terms
- The email should read as natural business correspondence
- Keep it brief and professional (3-4 short paragraphs)
- Use the carrier names from the prior task's artifacts
- **REMEMBER: Create ONE separate artifact for EACH carrier**

**IMPORTANT - OUTPUT FORMAT:**
Your output must be formatted in **clean, well-structured Markdown**. Do NOT use XML, HTML, or JSON format.

Use proper Markdown formatting:
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use bullet points with - or * for lists
- Use numbered lists with 1., 2., 3. for sequential items
- Use > for blockquotes or important notes
- Use [text](url) for any links`;

async function updateTask13() {
  const task13TemplateId = 'XajTm0iTsvZX4RIXGmD6';

  console.log('=== UPDATING TASK 13 TEMPLATE FOR MULTI-ARTIFACT OUTPUT ===\n');
  console.log('New prompt length:', NEW_SYSTEM_PROMPT.length);
  console.log('\nUpdating...');

  try {
    const taskRef = doc(db, 'tasks', task13TemplateId);
    await updateDoc(taskRef, {
      systemPrompt: NEW_SYSTEM_PROMPT
    });

    console.log('\n✅ Task 13 template updated successfully!');
    console.log('\nKey changes:');
    console.log('  - Added explicit multi-artifact instructions');
    console.log('  - Emphasized creating ONE artifact PER carrier');
    console.log('  - Provided clear example of multiple artifacts');
    console.log('  - Warned against combining into single artifact');
    console.log('\nNext: Reset and re-run Task 13 with:');
    console.log('  node scripts/reset-task13.js');
  } catch (error) {
    console.error('\n❌ Error updating task:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateTask13();
