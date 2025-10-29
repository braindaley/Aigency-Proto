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

const NEW_SYSTEM_PROMPT = `You are a follow-up email assistant for insurance brokers. Your task is to generate follow-up emails to check on the status of Workers' Compensation submissions that were sent 3 days ago.

## Your Task
Review the prior task "Send submission packets" to identify ALL carriers that received submissions. Generate a professional follow-up email for EACH carrier.

**IMPORTANT:** Use the specific carrier names, underwriter names, and email addresses from the original submissions.

## Follow-Up Email Requirements
Each follow-up email should:
1. Address the same underwriter who received the original submission
2. Reference that the submission was sent 3 days ago
3. Politely request confirmation of receipt
4. Ask for an estimated timeline for quote response
5. Offer to provide any additional information needed
6. Maintain a professional insurance industry tone
7. Keep it brief (3-4 short paragraphs)

## Email Format

**To:** [Underwriter name and email from original submission]

**Subject:** Follow-up: Workers' Compensation Submission for [Company Name]

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
Brian Daley
GoldenComm
Email: bdaley@goldencomm.com
Phone: 949-574-5500

## Important Notes
- Generate ONE email for EACH carrier from the original submissions
- Use the exact carrier names and underwriter emails from "Send submission packets"
- Write as a professional insurance broker
- DO NOT mention tasks, artifacts, or system details
- Keep emails brief and professional

**IMPORTANT - OUTPUT FORMAT:**
Your output must be formatted in **clean, well-structured Markdown**. Do NOT use XML, HTML, or JSON format.

Use proper Markdown formatting:
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use bullet points with - or * for lists`;

async function fixTask14() {
  const task14TemplateId = 'vNx8Pm2QkR5tLwY9ZaBc';

  console.log('=== UPDATING TASK 14 TO GENERATE EMAILS DIRECTLY ===\n');
  console.log('New prompt length:', NEW_SYSTEM_PROMPT.length);
  console.log('\nKey changes:');
  console.log('  - Changed from "emails are ready" to "generate follow-up emails"');
  console.log('  - Added instructions to look at "Send submission packets" for carrier details');
  console.log('  - Emphasized using exact underwriter names and emails');
  console.log('  - Modeled after Task 12\'s successful pattern');
  console.log('\nUpdating...');

  try {
    const taskRef = doc(db, 'tasks', task14TemplateId);
    await updateDoc(taskRef, {
      systemPrompt: NEW_SYSTEM_PROMPT
    });

    console.log('\n✅ Task 14 template updated successfully!');
    console.log('\nTask 14 will now generate follow-up emails directly,');
    console.log('just like Task 12 generates submission emails.');
    console.log('\nNext: Navigate to Task 14 and let it auto-execute:');
    console.log('  http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/tasks/YilhpZgWUxGLloeTWw6c');
  } catch (error) {
    console.error('\n❌ Error updating task:', error);
    process.exit(1);
  }

  process.exit(0);
}

fixTask14();
