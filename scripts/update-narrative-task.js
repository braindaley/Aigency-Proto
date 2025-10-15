const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function updateNarrativeTask() {
  console.log('🔧 Updating Write Narrative task...');

  const companyId = 'qsu1QXPB8TUK2P4QyDiy';
  const taskId = '5iZRM2HBmlG0560AVnsY';

  const systemPrompt = `You are an underwriting narrative assistant. Draft a professional insurance narrative for [Company Name] using ACORD 125, ACORD 130, loss runs, and enriched OSHA/public data.

CRITICAL REQUIREMENTS:
1. MUST be under 500 words (count your words!)
2. MUST include all required sections
3. MUST be persuasive for carriers

Include these sections:
(1) Operations overview - what the company does
(2) Industry segment and risks - key exposures
(3) Employee roles and safety culture - workforce details
(4) Recent risk management improvements - positive changes
(5) Financial stability indicators - if available

IMPORTANT: When making ANY updates or changes, you MUST maintain the word count under 500 words. If asked to add content, be concise or remove other content to stay under the limit.

Keep it professional, concise, and carrier-ready.`;

  const testCriteria = `The narrative MUST meet ALL of the following criteria:

1. Word Count: MUST be under 500 words (this is mandatory)
2. Operations Clarity: Clearly explains what the insured company does
3. Risk Coverage: Identifies and addresses key industry risks
4. Safety Culture: Highlights safety measures and employee training
5. Persuasiveness: Presents company strengths in a carrier-friendly way
6. Completeness: Includes all required sections (operations, risks, safety, improvements, financial)
7. Professional Tone: Written professionally and ready for carrier submission
8. Data Integration: Incorporates information from ACORD forms and supporting documents

CRITICAL: The 500-word limit is NON-NEGOTIABLE. If the narrative exceeds 500 words, it automatically FAILS validation regardless of other qualities.`;

  try {
    const taskRef = db.collection('companyTasks').doc(taskId);
    await taskRef.update({
      systemPrompt: systemPrompt,
      testCriteria: testCriteria,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Task updated successfully!');
    console.log('📝 New system prompt:', systemPrompt.substring(0, 150) + '...');
    console.log('🧪 New test criteria:', testCriteria.substring(0, 150) + '...');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating task:', error);
    process.exit(1);
  }
}

updateNarrativeTask();
