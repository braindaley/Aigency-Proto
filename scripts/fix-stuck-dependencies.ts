/**
 * Manual Dependency Fix Script
 *
 * Run this to manually trigger dependency updates for stuck tasks.
 * This replicates the logic from update-task-status API route.
 *
 * Usage:
 *   npx tsx scripts/fix-stuck-dependencies.ts
 *   npx tsx scripts/fix-stuck-dependencies.ts <companyId>
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔧 Initializing Firebase...');
console.log('Project ID:', firebaseConfig.projectId);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function checkAllDependenciesCompleted(
  dependencies: string[],
  companyId: string
): Promise<boolean> {
  console.log(`  📋 Checking ${dependencies.length} dependencies...`);

  for (const depId of dependencies) {
    // Try by document ID first
    let depSnapshot = await getDoc(doc(db, 'companyTasks', depId));

    // If not found, try by template ID
    if (!depSnapshot.exists()) {
      const tasksRef = collection(db, 'companyTasks');
      const allTasks = await getDocs(tasksRef);

      const matchingTask = allTasks.docs.find(taskDoc => {
        const data = taskDoc.data();
        return (data.templateId === depId || String(data.templateId) === depId) &&
               data.companyId === companyId;
      });

      if (!matchingTask) {
        console.log(`  ❌ Dependency not found: ${depId}`);
        return false;
      }

      depSnapshot = matchingTask;
    }

    const depData = depSnapshot.data();
    if (!depData) {
      console.log(`  ❌ Dependency data not found`);
      return false;
    }

    console.log(`    - "${depData.taskName}": ${depData.status} (${depData.tag})`);

    // A dependency is satisfied if:
    // 1. Status is 'completed', OR
    // 2. Status is 'Needs attention' AND task is tagged as 'ai' (meaning it's queued/running)
    const isSatisfied = depData.status === 'completed' ||
                       (depData.status === 'Needs attention' && depData.tag === 'ai');

    if (!isSatisfied) {
      console.log(`  ❌ Dependency not satisfied (must be 'completed' or AI task with 'Needs attention')`);
      return false;
    }
  }

  console.log(`  ✅ All dependencies completed!`);
  return true;
}

async function fixStuckDependencies(companyId: string) {
  console.log(`🔍 Scanning tasks for company: ${companyId}`);

  const tasksQuery = query(
    collection(db, 'companyTasks'),
    where('companyId', '==', companyId)
  );
  const snapshot = await getDocs(tasksQuery);

  console.log(`📊 Found ${snapshot.size} tasks\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const taskDoc of snapshot.docs) {
    const task = taskDoc.data();

    // Skip if no dependencies
    if (!task.dependencies || task.dependencies.length === 0) {
      continue;
    }

    // Skip if already completed or already "Needs attention"
    if (task.status === 'completed' || task.status === 'Needs attention') {
      skippedCount++;
      continue;
    }

    console.log(`\n🔄 Checking: "${task.taskName}" (${taskDoc.id})`);
    console.log(`  Current status: ${task.status}`);
    console.log(`  Dependencies: ${JSON.stringify(task.dependencies)}`);

    // Check if all dependencies are met
    const allCompleted = await checkAllDependenciesCompleted(
      task.dependencies,
      companyId
    );

    if (allCompleted) {
      console.log(`  🎯 Using API to update status (this will auto-trigger AI if needed)...`);

      try {
        // Use the API endpoint to properly trigger dependencies
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9003';
        const response = await fetch(`${baseUrl}/api/update-task-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: taskDoc.id,
            status: 'Needs attention'
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        console.log(`  ✅ Updated via API!`);
        updatedCount++;

        if (task.tag === 'ai') {
          console.log(`  🤖 AI task will auto-trigger in the background`);
        }
      } catch (error) {
        console.error(`  ❌ API call failed, falling back to direct update:`, error);

        // Fallback to direct update
        await updateDoc(doc(db, 'companyTasks', taskDoc.id), {
          status: 'Needs attention',
          updatedAt: new Date().toISOString()
        });

        console.log(`  ✅ Updated directly (AI auto-trigger skipped)`);
        updatedCount++;

        if (task.tag === 'ai') {
          console.log(`  💡 Note: This is an AI task. You may need to manually trigger it.`);
        }
      }
    } else {
      console.log(`  ⏸️ Not all dependencies met, leaving as "${task.status}"`);
      skippedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updatedCount} tasks`);
  console.log(`  ⏭️ Skipped: ${skippedCount} tasks`);
  console.log(`\n✨ Done!`);
}

// Main execution
async function main() {
  let companyId = process.argv[2];

  // If no company ID provided, list all companies
  if (!companyId) {
    console.log('\n📋 Fetching all companies...\n');
    const companiesSnapshot = await getDocs(collection(db, 'companies'));

    if (companiesSnapshot.empty) {
      console.error('❌ No companies found in database');
      process.exit(1);
    }

    console.log('Available companies:');
    companiesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.name || 'Unnamed'}`);
    });

    // Use the first company
    companyId = companiesSnapshot.docs[0].id;
    console.log(`\n🎯 Using first company: ${companyId}\n`);
  }

  await fixStuckDependencies(companyId);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
