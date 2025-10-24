/**
 * Task Completion Utilities
 *
 * Centralized utilities for marking tasks as completed and triggering
 * dependency updates. This ensures consistent behavior across the app
 * and prevents dependent tasks from getting stuck.
 */

import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';

interface TaskCompletionOptions {
  skipDependencyCheck?: boolean;
  retries?: number;
  fallbackToDirect?: boolean;
}

/**
 * Mark a task as completed and trigger dependent task updates
 *
 * This function ALWAYS ensures:
 * 1. Task status is updated to 'completed'
 * 2. Dependent tasks are checked and updated to 'Needs attention'
 * 3. AI-tagged dependent tasks are auto-triggered
 *
 * @param taskId - The task ID to complete
 * @param options - Optional configuration
 * @returns Promise<void>
 */
export async function completeTask(
  taskId: string,
  options: TaskCompletionOptions = {}
): Promise<void> {
  const {
    skipDependencyCheck = false,
    retries = 2,
    fallbackToDirect = true
  } = options;

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎯 COMPLETE-TASK: Starting for taskId=${taskId}`);

  let lastError: Error | null = null;

  // Try to use the API endpoint first (preferred method)
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const baseUrl = getBaseUrl();
      console.log(`[${timestamp}] 🌐 COMPLETE-TASK: Attempt ${attempt + 1}/${retries + 1} - Calling API at ${baseUrl}`);

      const response = await fetch(`${baseUrl}/api/update-task-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          status: 'completed'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[${timestamp}] ✅ COMPLETE-TASK: Task completed via API:`, result);
        return; // Success!
      } else {
        const errorText = await response.text();
        lastError = new Error(`API returned ${response.status}: ${errorText}`);
        console.error(`[${timestamp}] ⚠️ COMPLETE-TASK: API attempt ${attempt + 1} failed:`, lastError.message);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[${timestamp}] ⚠️ COMPLETE-TASK: API attempt ${attempt + 1} errored:`, lastError.message);
    }

    // Wait before retry (exponential backoff)
    if (attempt < retries) {
      const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
      console.log(`[${timestamp}] ⏳ COMPLETE-TASK: Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If API failed after all retries, fall back to direct database update
  if (fallbackToDirect) {
    console.log(`[${timestamp}] 🔄 COMPLETE-TASK: API failed after ${retries + 1} attempts, using direct database update`);
    console.log(`[${timestamp}]   Last error:`, lastError?.message);

    try {
      // Update task status directly in Firestore
      const taskDocRef = doc(db, 'companyTasks', taskId);
      await updateDoc(taskDocRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`[${timestamp}] ✅ COMPLETE-TASK: Task status updated in database`);

      // Manually trigger dependency updates since we bypassed the API
      if (!skipDependencyCheck) {
        console.log(`[${timestamp}] 🔗 COMPLETE-TASK: Manually triggering dependency updates...`);
        await updateDependentTasksDirect(taskId);
      }

      return; // Success!
    } catch (dbError) {
      console.error(`[${timestamp}] ❌ COMPLETE-TASK: Database update also failed:`, dbError);
      throw new Error(
        `Failed to complete task via API (${lastError?.message}) and database (${dbError instanceof Error ? dbError.message : 'unknown error'})`
      );
    }
  } else {
    throw new Error(
      `Failed to complete task via API after ${retries + 1} attempts: ${lastError?.message}`
    );
  }
}

/**
 * Directly update dependent tasks when API is unavailable
 * This is a fallback that replicates the logic from /api/update-task-status
 */
async function updateDependentTasksDirect(completedTaskId: string): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[${timestamp}] 🔍 UPDATE-DEPS-DIRECT: Finding dependent tasks for ${completedTaskId}`);

    // Get the completed task
    const completedTaskRef = doc(db, 'companyTasks', completedTaskId);
    const completedTaskSnap = await getDoc(completedTaskRef);

    if (!completedTaskSnap.exists()) {
      console.error(`[${timestamp}] ❌ UPDATE-DEPS-DIRECT: Task not found`);
      return;
    }

    const completedTask = completedTaskSnap.data();
    const completedTemplateId = completedTask.templateId;
    const companyId = completedTask.companyId;

    console.log(`[${timestamp}] 📋 UPDATE-DEPS-DIRECT: Completed task: "${completedTask.taskName}" (template: ${completedTemplateId})`);

    // Find all tasks with this as a dependency
    const tasksRef = collection(db, 'companyTasks');
    const allTasksSnapshot = await getDocs(tasksRef);

    const dependentTasks = allTasksSnapshot.docs.filter(taskDoc => {
      const data = taskDoc.data();
      if (!data.dependencies || !Array.isArray(data.dependencies)) {
        return false;
      }

      // Match by doc ID or template ID
      return data.dependencies.includes(completedTaskId) ||
             data.dependencies.includes(completedTemplateId) ||
             data.dependencies.includes(String(completedTemplateId));
    });

    console.log(`[${timestamp}] 📊 UPDATE-DEPS-DIRECT: Found ${dependentTasks.length} dependent tasks`);

    if (dependentTasks.length === 0) {
      console.log(`[${timestamp}] ℹ️ UPDATE-DEPS-DIRECT: No dependent tasks found`);
      return;
    }

    // Process each dependent task
    for (const taskDoc of dependentTasks) {
      const taskData = taskDoc.data();
      console.log(`[${timestamp}] 🔄 UPDATE-DEPS-DIRECT: Checking "${taskData.taskName}" (${taskDoc.id})`);

      // Skip if already completed
      if (taskData.status === 'completed') {
        console.log(`[${timestamp}]   ⏭️ Already completed, skipping`);
        continue;
      }

      // Check if all dependencies are met
      const allDepsCompleted = await checkAllDependenciesCompleted(
        taskData.dependencies,
        companyId
      );

      console.log(`[${timestamp}]   - All deps completed: ${allDepsCompleted}`);
      console.log(`[${timestamp}]   - Current status: ${taskData.status}`);
      console.log(`[${timestamp}]   - Tag: ${taskData.tag}`);

      if (allDepsCompleted && taskData.status !== 'Needs attention') {
        // Update to Needs attention
        await updateDoc(doc(db, 'companyTasks', taskDoc.id), {
          status: 'Needs attention',
          updatedAt: new Date().toISOString()
        });

        console.log(`[${timestamp}]   ✅ Updated to 'Needs attention'`);

        // Auto-trigger AI tasks
        if (taskData.tag === 'ai') {
          console.log(`[${timestamp}]   🤖 AI task - triggering auto-execution`);

          // Trigger AI execution (non-blocking)
          triggerAITask(taskDoc.id, companyId).catch(err => {
            console.error(`[${timestamp}]   ❌ Failed to trigger AI:`, err);
          });
        }
      } else if (allDepsCompleted && taskData.status === 'Needs attention') {
        console.log(`[${timestamp}]   ℹ️ Already 'Needs attention', no update needed`);
      } else {
        console.log(`[${timestamp}]   ⏸️ Dependencies not met, staying as ${taskData.status}`);
      }
    }

    console.log(`[${timestamp}] ✅ UPDATE-DEPS-DIRECT: Finished processing dependencies`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ UPDATE-DEPS-DIRECT ERROR:`, error);
    // Don't throw - this is a best-effort operation
  }
}

/**
 * Check if all dependencies for a task are completed
 */
async function checkAllDependenciesCompleted(
  dependencies: string[],
  companyId: string
): Promise<boolean> {
  const timestamp = new Date().toISOString();

  try {
    for (const depId of dependencies) {
      // Try by document ID first
      let depSnapshot = await getDoc(doc(db, 'companyTasks', depId));

      // If not found, search by template ID
      if (!depSnapshot.exists()) {
        const tasksRef = collection(db, 'companyTasks');
        const allTasks = await getDocs(tasksRef);

        const matchingTask = allTasks.docs.find(taskDoc => {
          const data = taskDoc.data();
          return (data.templateId === depId || String(data.templateId) === depId) &&
                 data.companyId === companyId;
        });

        if (!matchingTask) {
          console.log(`[${timestamp}]   ❌ Dependency not found: ${depId}`);
          return false;
        }

        depSnapshot = matchingTask;
      }

      const depData = depSnapshot.data();
      if (depData && depData.status !== 'completed') {
        console.log(`[${timestamp}]   ❌ Dependency "${depData.taskName}" not completed (status: ${depData.status})`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`[${timestamp}]   ❌ Error checking dependencies:`, error);
    return false;
  }
}

/**
 * Trigger AI task execution (non-blocking)
 */
async function triggerAITask(taskId: string, companyId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const cloudFunctionUrl = process.env.NEXT_PUBLIC_FIREBASE_CLOUD_FUNCTION_URL ||
    'https://us-central1-aigency-proto.cloudfunctions.net/processAITask';

  try {
    const response = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { taskId, companyId } }),
    });

    if (!response.ok) {
      throw new Error(`AI trigger failed: ${response.status}`);
    }

    console.log(`✅ AI task ${taskId} triggered successfully`);
  } catch (error) {
    console.error(`❌ Failed to trigger AI task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Get the base URL for API calls
 */
function getBaseUrl(): string {
  // Priority order: explicit env var > computed from window > localhost
  if (typeof process !== 'undefined' && process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // In browser context
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Fallback to localhost
  return 'http://localhost:9003';
}

/**
 * Mark task as failed with error message
 */
export async function failTask(
  taskId: string,
  errorMessage: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ❌ FAIL-TASK: Marking task ${taskId} as failed`);

  try {
    const taskDocRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskDocRef, {
      status: 'failed',
      error: errorMessage,
      failedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`[${timestamp}] ✅ FAIL-TASK: Task marked as failed`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ FAIL-TASK: Failed to mark task as failed:`, error);
    throw error;
  }
}
