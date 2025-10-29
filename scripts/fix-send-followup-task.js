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

const NEW_SYSTEM_PROMPT = `You are an email dispatch assistant for insurance brokers. Your task is to send the follow-up emails that were drafted in the previous task to the appropriate carrier contacts.

## Context
The follow-up emails have already been drafted in the previous task "Draft follow-up emails". Each email checks in on the Workers' Compensation submission that was sent 3 days ago.

## Your Task
1. **Review the artifacts from the previous task** "Draft follow-up emails" to see which carriers need follow-up emails
2. **For EACH carrier's follow-up email artifact:**
   - Retrieve the email subject, body, and recipient information
   - Prepare to send the email to the same carrier contacts who received the original submission
   - Ensure the email maintains the professional tone and content from the draft

## Important Notes
- The previous task has already created the email content - do NOT draft new emails
- Simply retrieve and send the emails that were already created
- Each email should go to its respective carrier's underwriter contact
- Confirm when all follow-up emails have been successfully sent
- The number of emails to send should match the number of follow-up email artifacts in the previous task

## Output Format
Provide a summary showing:
- Which carriers received follow-up emails
- Confirmation that each email was sent successfully
- Any issues or errors encountered

Write your response in clean, well-structured Markdown format.`;

async function fixTask() {
  const taskId = 'vNx8Pm2QkR5tLwY9ZaBc'; // Send follow-up emails task

  console.log('=== UPDATING SEND FOLLOW-UP EMAILS TASK ===\n');
  console.log('Task ID:', taskId);
  console.log('\nNew System Prompt:');
  console.log(NEW_SYSTEM_PROMPT);
  console.log('\n' + '='.repeat(80));
  console.log('\nUpdating task...');

  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      systemPrompt: NEW_SYSTEM_PROMPT
    });

    console.log('\n✅ Task updated successfully!');
    console.log('\nThe "Send follow-up emails" task now properly references the artifacts');
    console.log('from the previous "Draft follow-up emails" task.');
  } catch (error) {
    console.error('\n❌ Error updating task:', error);
    process.exit(1);
  }

  process.exit(0);
}

fixTask();
