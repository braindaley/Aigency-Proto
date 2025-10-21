/**
 * Manually trigger the dependency update for task 3
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');

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

async function updateDependentTasks(completedTaskId) {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] 🔍 DEPENDENT-TASKS: Starting search for tasks depending on ${completedTaskId}`);

    // Get the completed task to find its template ID
    const completedTaskRef = doc(db, 'companyTasks', completedTaskId);
    const completedTaskSnap = await getDoc(completedTaskRef);

    if (!completedTaskSnap.exists()) {
      console.error(`[${timestamp}] ❌ DEPENDENT-TASKS: Completed task not found: ${completedTaskId}`);
      return;
    }

    const completedTaskData = completedTaskSnap.data();
    const completedTemplateId = completedTaskData.templateId;
    const completedTaskName = completedTaskData.taskName;

    console.log(`[${timestamp}] 📋 DEPENDENT-TASKS: Completed task: "${completedTaskName}" (template: ${completedTemplateId})`);

    // Find all tasks that have this task as a dependency
    const tasksRef = collection(db, 'companyTasks');
    const snapshot = await getDocs(tasksRef);

    const dependentTasks = snapshot.docs.filter(doc => {
      const data = doc.data();
      if (!data.dependencies || !Array.isArray(data.dependencies)) {
        return false;
      }

      // Check if dependencies include either the document ID or template ID
      return data.dependencies.includes(completedTaskId) ||
             data.dependencies.includes(completedTemplateId) ||
             data.dependencies.includes(String(completedTemplateId));
    });

    console.log(`[${timestamp}] 📊 DEPENDENT-TASKS: Found ${dependentTasks.length} dependent tasks`);

    if (dependentTasks.length === 0) {
      console.log(`[${timestamp}] ℹ️ DEPENDENT-TASKS: No dependent tasks found, done.`);
      return;
    }

    // Update each dependent task
    for (const taskDoc of dependentTasks) {
      const taskData = taskDoc.data();
      console.log(`[${timestamp}] 🔄 DEPENDENT-TASKS: Checking task "${taskData.taskName}" (${taskDoc.id})`);
      console.log(`[${timestamp}]   - Status: ${taskData.status}`);
      console.log(`[${timestamp}]   - Tag: ${taskData.tag}`);
      console.log(`[${timestamp}]   - Dependencies: ${JSON.stringify(taskData.dependencies)}`);

      // Check if all dependencies for this task are completed
      const allDependenciesCompleted = await checkAllDependenciesCompleted(taskData.dependencies, taskData.companyId, snapshot);

      console.log(`[${timestamp}]   - All dependencies met: ${allDependenciesCompleted}`);

      if (allDependenciesCompleted && taskData.status !== 'completed') {
        // Check if task is already 'Needs attention'
        const isAlreadyNeedsAttention = taskData.status === 'Needs attention';

        if (!isAlreadyNeedsAttention) {
          await updateDoc(doc(db, 'companyTasks', taskDoc.id), {
            status: 'Needs attention',
            updatedAt: new Date().toISOString()
          });
          console.log(`[${timestamp}] ✅ DEPENDENT-TASKS: Updated task ${taskDoc.id} to 'Needs attention'`);
        } else {
          console.log(`[${timestamp}] ⏭️ DEPENDENT-TASKS: Task ${taskDoc.id} already 'Needs attention', skipping status update`);
        }
      } else if (taskData.status === 'completed') {
        console.log(`[${timestamp}] ⏭️ DEPENDENT-TASKS: Task already completed, skipping`);
      } else {
        console.log(`[${timestamp}] ⏸️ DEPENDENT-TASKS: Not all dependencies met yet, leaving as-is`);
      }
    }

    console.log(`[${timestamp}] ✅ DEPENDENT-TASKS: Finished processing dependent tasks`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ DEPENDENT-TASKS ERROR:`, error);
  }
}

async function checkAllDependenciesCompleted(dependencies, companyId, allTasksSnapshot) {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] 🔍 CHECK-DEPS: Checking ${dependencies.length} dependencies for company ${companyId}`);

    for (const depId of dependencies) {
      console.log(`[${timestamp}] 🔍 CHECK-DEPS: Checking dependency: ${depId}`);

      // First try to find by document ID
      let depDocRef = doc(db, 'companyTasks', depId);
      let depSnapshot = await getDoc(depDocRef);

      // If not found by document ID, try to find by template ID within the same company
      if (!depSnapshot.exists()) {
        console.log(`[${timestamp}]   - Not found by doc ID, searching by template ID...`);

        const matchingTask = allTasksSnapshot.docs.find(taskDoc => {
          const taskData = taskDoc.data();
          return (taskData.templateId === depId || String(taskData.templateId) === depId) &&
                 taskData.companyId === companyId;
        });

        if (!matchingTask) {
          console.log(`[${timestamp}]   ❌ Dependency not found: ${depId}`);
          return false;
        }

        depSnapshot = matchingTask;
        console.log(`[${timestamp}]   ✅ Found by template ID: ${matchingTask.id}`);
      } else {
        console.log(`[${timestamp}]   ✅ Found by doc ID`);
      }

      const depData = depSnapshot.data();
      const depTaskName = depData.taskName || 'Unknown';
      console.log(`[${timestamp}]   - Task: "${depTaskName}"`);
      console.log(`[${timestamp}]   - Status: ${depData.status}`);

      if (depData.status !== 'completed') {
        console.log(`[${timestamp}]   ❌ NOT COMPLETED - stopping check`);
        return false;
      }
      console.log(`[${timestamp}]   ✅ COMPLETED`);
    }
    console.log(`[${timestamp}] ✅ CHECK-DEPS: All ${dependencies.length} dependencies are completed`);
    return true;
  } catch (error) {
    console.error(`[${timestamp}] ❌ CHECK-DEPS ERROR:`, error);
    return false;
  }
}

async function main() {
  const task3DocId = 'XUvnwH26Xgx67tHoS3aP';
  console.log('=== MANUALLY TRIGGERING DEPENDENCY UPDATE FOR TASK 3 ===\n');
  await updateDependentTasks(task3DocId);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
