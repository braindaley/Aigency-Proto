/**
 * Recover Missing Artifact Script
 *
 * Extracts artifact from task chat messages and saves to artifacts collection
 *
 * Usage:
 *   npx tsx scripts/recover-missing-artifact.ts <taskId> <companyId>
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function extractArtifact(text: string): Promise<string | null> {
  // Try XML format first
  const xmlMatch = text.match(/<artifact(?:\s+id="[^"]+")?>(\s\S]*?)<\/artifact>/);
  if (xmlMatch) {
    return xmlMatch[1].trim();
  }

  // Try markdown format
  const markdownMatch = text.match(/```artifact\s*\n([\s\S]*?)\n```/);
  if (markdownMatch) {
    return markdownMatch[1].trim();
  }

  return null;
}

async function recoverArtifact(taskId: string, companyId: string) {
  console.log(`🔍 Recovering artifact for task ${taskId}...`);

  // Get chat messages
  const chatRef = collection(db, 'taskChats', taskId, 'messages');
  const q = query(chatRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);

  console.log(`Found ${snapshot.size} messages`);

  let artifactContent: string | null = null;

  // Look through messages for artifact
  for (const msgDoc of snapshot.docs) {
    const data = msgDoc.data();
    const content = data.content || '';

    const extracted = await extractArtifact(content);
    if (extracted && extracted.length > 100) {
      artifactContent = extracted;
      console.log(`✅ Found artifact in message (${extracted.length} chars)`);
      break;
    }
  }

  if (!artifactContent) {
    console.error('❌ No artifact found in chat messages');
    process.exit(1);
  }

  // Save to artifacts collection
  const artifactsRef = collection(db, 'companies', companyId, 'artifacts');

  const artifactDoc = {
    taskId: taskId,
    companyId: companyId,
    content: artifactContent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    type: 'document',
    recovered: true, // Mark as recovered
  };

  await addDoc(artifactsRef, artifactDoc);

  console.log('✅ Artifact saved to companies/' + companyId + '/artifacts');
  console.log(`📄 Content preview: ${artifactContent.substring(0, 100)}...`);
}

// Main
const taskId = process.argv[2];
const companyId = process.argv[3];

if (!taskId || !companyId) {
  console.error('❌ Usage: npx tsx scripts/recover-missing-artifact.ts <taskId> <companyId>');
  console.error('Example: npx tsx scripts/recover-missing-artifact.ts NDBCiTzBSvw0HeMHnXMd F85kRF3NIwY3mcOwgTnf');
  process.exit(1);
}

recoverArtifact(taskId, companyId)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
