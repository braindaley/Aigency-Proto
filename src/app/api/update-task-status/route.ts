import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, query, where, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  try {
    const { taskId, status } = await request.json();

    console.log(`[${timestamp}] 🔄 UPDATE-TASK-STATUS: Received request for taskId=${taskId}, status=${status}`);

    if (!taskId || !status) {
      console.log(`[${timestamp}] ❌ UPDATE-TASK-STATUS: Missing required fields`);
      return NextResponse.json(
        { error: 'Missing taskId or status' },
        { status: 400 }
      );
    }

    // Update the task status in Firebase
    const taskDocRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskDocRef, {
      status: status,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });

    console.log(`[${timestamp}] ✅ UPDATE-TASK-STATUS: Task ${taskId} updated to status=${status}`);

    // If task is completed, check for dependent tasks and update them
    if (status === 'completed') {
      console.log(`[${timestamp}] 🔍 UPDATE-TASK-STATUS: Task completed, checking for dependent tasks...`);
      await updateDependentTasks(taskId);
    }

    return NextResponse.json({
      success: true,
      message: `Task status updated to ${status}`
    });

  } catch (error) {
    console.error(`[${timestamp}] ❌ UPDATE-TASK-STATUS ERROR:`, error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}

async function updateDependentTasks(completedTaskId: string) {
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

    // Find all tasks that have this task as a dependency (check both document ID and template ID)
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
      const allDependenciesCompleted = await checkAllDependenciesCompleted(taskData.dependencies, taskData.companyId);

      console.log(`[${timestamp}]   - All dependencies met: ${allDependenciesCompleted}`);

      if (allDependenciesCompleted && taskData.status !== 'completed') {
        await updateDoc(doc(db, 'companyTasks', taskDoc.id), {
          status: 'Needs attention',
          updatedAt: new Date().toISOString()
        });
        console.log(`[${timestamp}] ✅ DEPENDENT-TASKS: Updated task ${taskDoc.id} to 'Needs attention'`);

        // If this is an AI task, automatically trigger execution
        if (taskData.tag === 'ai') {
          console.log(`[${timestamp}] 🤖 DEPENDENT-TASKS: Task is AI-enabled, triggering auto-execution...`);

          // Trigger AI task execution in the background
          triggerAIExecution(taskDoc.id, taskData.companyId).catch(err => {
            console.error(`[${timestamp}] ❌ DEPENDENT-TASKS: Failed to trigger AI execution for task ${taskDoc.id}:`, err);
          });
        } else {
          console.log(`[${timestamp}] 👤 DEPENDENT-TASKS: Task is manual (tag: ${taskData.tag}), no auto-execution`);
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

async function triggerAIExecution(taskId: string, companyId: string) {
  const timestamp = new Date().toISOString();
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    console.log(`[${timestamp}] 🚀 AI-TRIGGER: Initiating AI execution for task ${taskId}`);
    console.log(`[${timestamp}] 🌐 AI-TRIGGER: Request URL: ${baseUrl}/api/ai-task-completion`);

    const response = await fetch(`${baseUrl}/api/ai-task-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, companyId }),
    });

    console.log(`[${timestamp}] 📡 AI-TRIGGER: Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${timestamp}] ❌ AI-TRIGGER: Execution failed:`, errorData);
      throw new Error(`AI execution failed: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log(`[${timestamp}] ✅ AI-TRIGGER: Execution completed successfully`);
    console.log(`[${timestamp}] 📊 AI-TRIGGER: Results:`, {
      success: result.success,
      taskCompleted: result.taskCompleted,
      documentsUsed: result.documentsUsed,
      artifactsUsed: result.artifactsUsed
    });

    return result;
  } catch (error) {
    console.error(`[${timestamp}] ❌ AI-TRIGGER ERROR for task ${taskId}:`, error);
    throw error;
  }
}

async function checkAllDependenciesCompleted(dependencies: string[], companyId: string): Promise<boolean> {
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
        const tasksRef = collection(db, 'companyTasks');
        const querySnapshot = await getDocs(tasksRef);

        const matchingTask = querySnapshot.docs.find(taskDoc => {
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