import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, query, where, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { taskId, status } = await request.json();

    if (!taskId || !status) {
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

    // If task is completed, check for dependent tasks and update them
    if (status === 'completed') {
      await updateDependentTasks(taskId);
    }

    return NextResponse.json({
      success: true,
      message: `Task status updated to ${status}`
    });

  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}

async function updateDependentTasks(completedTaskId: string) {
  try {
    // Get the completed task to find its template ID
    const completedTaskRef = doc(db, 'companyTasks', completedTaskId);
    const completedTaskSnap = await getDoc(completedTaskRef);
    
    if (!completedTaskSnap.exists()) {
      console.error('Completed task not found:', completedTaskId);
      return;
    }
    
    const completedTaskData = completedTaskSnap.data();
    const completedTemplateId = completedTaskData.templateId;
    
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

    console.log(`Found ${dependentTasks.length} dependent tasks for completed task ${completedTaskId} (template: ${completedTemplateId})`);

    // Update each dependent task
    for (const taskDoc of dependentTasks) {
      const taskData = taskDoc.data();
      
      // Check if all dependencies for this task are completed
      const allDependenciesCompleted = await checkAllDependenciesCompleted(taskData.dependencies, taskData.companyId);
      
      if (allDependenciesCompleted && taskData.status !== 'completed') {
        await updateDoc(doc(db, 'companyTasks', taskDoc.id), {
          status: 'Needs attention',
          updatedAt: new Date().toISOString()
        });
        console.log(`Updated dependent task ${taskDoc.id} to 'Needs attention'`);
      }
    }
  } catch (error) {
    console.error('Error updating dependent tasks:', error);
  }
}

async function checkAllDependenciesCompleted(dependencies: string[], companyId: string): Promise<boolean> {
  try {
    for (const depId of dependencies) {
      // First try to find by document ID
      let depDocRef = doc(db, 'companyTasks', depId);
      let depSnapshot = await getDoc(depDocRef);
      
      // If not found by document ID, try to find by template ID within the same company
      if (!depSnapshot.exists()) {
        const tasksRef = collection(db, 'companyTasks');
        const querySnapshot = await getDocs(tasksRef);
        
        const matchingTask = querySnapshot.docs.find(taskDoc => {
          const taskData = taskDoc.data();
          return (taskData.templateId === depId || String(taskData.templateId) === depId) && 
                 taskData.companyId === companyId;
        });
        
        if (!matchingTask) {
          console.log(`Dependency not found: ${depId} for company ${companyId}`);
          continue;
        }
        
        depSnapshot = matchingTask;
      }
      
      const depData = depSnapshot.data();
      if (depData.status !== 'completed') {
        console.log(`Dependency ${depId} is not completed (status: ${depData.status})`);
        return false;
      }
    }
    console.log('All dependencies are completed');
    return true;
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return false;
  }
}