import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { taskIds } = await request.json();

    // Load the workers-comp-tasks-complete.json file
    const tasksFile = path.join(process.cwd(), 'workers-comp-tasks-complete.json');
    const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

    const results = [];

    for (const taskId of taskIds) {
      const task = tasksData.find((t: any) => t.id === taskId);

      if (!task) {
        results.push({ taskId, success: false, error: 'Task not found in JSON file' });
        continue;
      }

      try {
        const taskRef = doc(db, 'taskTemplates', taskId);
        await updateDoc(taskRef, {
          systemPrompt: task.systemPrompt,
          testCriteria: task.testCriteria,
          updatedAt: new Date()
        });

        results.push({
          taskId,
          success: true,
          taskName: task.taskName,
          sortOrder: task.sortOrder
        });
      } catch (error: any) {
        results.push({
          taskId,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('Error updating task templates:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
