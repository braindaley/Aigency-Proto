import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * API Endpoint: Refresh Task Statuses
 *
 * This endpoint checks all tasks for a company/renewal and updates tasks
 * to "Needs attention" if all their dependencies are completed.
 *
 * This solves the issue where tasks get stuck in "Upcoming" status
 * when dependencies complete but the status update didn't trigger.
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const { companyId, renewalType } = await request.json();

    console.log(`[${timestamp}] 🔄 REFRESH-STATUSES: Starting for company=${companyId}, renewalType=${renewalType}`);

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId' },
        { status: 400 }
      );
    }

    // Get all tasks for this company/renewal
    const tasksRef = collection(db, 'companyTasks');
    let tasksQuery = query(tasksRef, where('companyId', '==', companyId));

    if (renewalType) {
      tasksQuery = query(tasksRef,
        where('companyId', '==', companyId),
        where('renewalType', '==', renewalType)
      );
    }

    const tasksSnapshot = await getDocs(tasksQuery);

    const tasks = tasksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        taskName: data.taskName,
        status: data.status,
        dependencies: data.dependencies || [],
        templateId: data.templateId,
        tag: data.tag,
        companyId: data.companyId,
        ...data
      };
    });

    console.log(`[${timestamp}] 📊 REFRESH-STATUSES: Found ${tasks.length} tasks`);

    // Find tasks that should be "Needs attention"
    const tasksToUpdate: any[] = [];

    for (const task of tasks) {
      // Skip if not in "Upcoming" status
      if (task.status !== 'Upcoming') {
        continue;
      }

      // Check if all dependencies are completed
      const dependencies = task.dependencies || [];

      if (dependencies.length === 0) {
        // No dependencies = should be "Needs attention"
        tasksToUpdate.push({
          task,
          reason: 'No dependencies'
        });
        continue;
      }

      let allCompleted = true;
      const depStatuses = [];

      for (const depId of dependencies) {
        // Find the dependency task by template ID or document ID
        const depTask = tasks.find(t =>
          t.templateId === depId ||
          t.id === depId ||
          String(t.templateId) === depId
        );

        if (!depTask) {
          console.log(`[${timestamp}]   ⚠️  Dependency not found: ${depId}`);
          allCompleted = false;
          break;
        }

        // Check if dependency is satisfied
        const isSatisfied = depTask.status === 'completed' ||
                           (depTask.status === 'Needs attention' && depTask.tag === 'ai');

        depStatuses.push({
          name: depTask.taskName,
          status: depTask.status,
          satisfied: isSatisfied
        });

        if (!isSatisfied) {
          allCompleted = false;
          break;
        }
      }

      if (allCompleted) {
        tasksToUpdate.push({
          task,
          reason: 'All dependencies completed',
          depStatuses
        });
      }
    }

    console.log(`[${timestamp}] 📋 REFRESH-STATUSES: Found ${tasksToUpdate.length} tasks to update`);

    if (tasksToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All task statuses are correct',
        updated: 0
      });
    }

    // Update tasks
    const updatedTasks = [];
    const triggeredAITasks = [];

    for (const { task, reason } of tasksToUpdate) {
      try {
        const taskRef = doc(db, 'companyTasks', task.id);
        await updateDoc(taskRef, {
          status: 'Needs attention',
          updatedAt: new Date().toISOString()
        });

        console.log(`[${timestamp}] ✅ REFRESH-STATUSES: Updated "${task.taskName}" (${reason})`);

        updatedTasks.push({
          id: task.id,
          name: task.taskName,
          reason
        });

        // Auto-trigger AI tasks
        if (task.tag === 'ai') {
          console.log(`[${timestamp}] 🤖 REFRESH-STATUSES: Triggering AI task "${task.taskName}"`);

          try {
            const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9003';
            const response = await fetch(`${baseUrl}/api/ai-task-completion-async`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId: task.id,
                companyId: task.companyId
              }),
            });

            if (response.ok) {
              console.log(`[${timestamp}]   ✅ AI task triggered`);
              triggeredAITasks.push({
                id: task.id,
                name: task.taskName
              });
            } else {
              console.log(`[${timestamp}]   ⚠️  Failed to trigger AI task`);
            }
          } catch (error) {
            console.error(`[${timestamp}]   ❌ Error triggering AI:`, error);
          }
        }
      } catch (error) {
        console.error(`[${timestamp}] ❌ REFRESH-STATUSES: Failed to update "${task.taskName}":`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedTasks.length} task(s)`,
      updated: updatedTasks.length,
      tasks: updatedTasks,
      aiTasksTriggered: triggeredAITasks.length,
      triggeredTasks: triggeredAITasks
    });

  } catch (error) {
    console.error(`[${timestamp}] ❌ REFRESH-STATUSES ERROR:`, error);
    return NextResponse.json(
      { error: 'Failed to refresh task statuses' },
      { status: 500 }
    );
  }
}
