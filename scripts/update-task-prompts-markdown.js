/**
 * Update all task template system prompts to enforce markdown formatting
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

const MARKDOWN_INSTRUCTION = `

**IMPORTANT - OUTPUT FORMAT:**
Your output must be formatted in **clean, well-structured Markdown**. Do NOT use XML, HTML, or JSON format.

Use proper Markdown formatting:
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use bullet points with - or * for lists
- Use numbered lists with 1., 2., 3. for sequential items
- Use > for blockquotes or important notes
- Use [text](url) for any links

Example of correct markdown structure:
# Document Title

## Section Name

**Key Point:** Description here

- Bullet point 1
- Bullet point 2

## Another Section

1. First item
2. Second item

> Important note or callout`;

async function updateTaskTemplates() {
  try {
    console.log('🔍 Fetching all task templates...\n');

    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);

    if (snapshot.empty) {
      console.log('No task templates found.');
      return;
    }

    console.log(`Found ${snapshot.size} task templates\n`);

    let updated = 0;
    let skipped = 0;

    for (const taskDoc of snapshot.docs) {
      const task = taskDoc.data();
      const taskId = taskDoc.id;

      // Only update tasks that have a system prompt and use artifacts (interfaceType: 'artifact')
      if (task.interfaceType === 'artifact' && task.systemPrompt) {
        const currentPrompt = task.systemPrompt;

        // Check if already has markdown instructions
        if (currentPrompt.includes('OUTPUT FORMAT') ||
            currentPrompt.includes('Markdown format') ||
            currentPrompt.includes('well-structured Markdown')) {
          console.log(`⏭️  Skipping "${task.taskName}" - already has format instructions`);
          skipped++;
          continue;
        }

        // Append markdown instructions
        const updatedPrompt = currentPrompt + MARKDOWN_INSTRUCTION;

        await updateDoc(doc(db, 'tasks', taskId), {
          systemPrompt: updatedPrompt,
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Updated "${task.taskName}"`);
        updated++;
      } else {
        console.log(`⏭️  Skipping "${task.taskName}" - ${!task.systemPrompt ? 'no system prompt' : 'not an artifact task'}`);
        skipped++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${snapshot.size}`);

  } catch (error) {
    console.error('❌ Error updating task templates:', error);
    process.exit(1);
  }
}

updateTaskTemplates()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
