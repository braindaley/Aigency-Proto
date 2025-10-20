import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const companyId = 'qsu1QXPB8TUK2P4QyDiy';

    // Load the workers-comp-tasks-complete.json file
    const tasksFile = path.join(process.cwd(), 'workers-comp-tasks-complete.json');
    const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

    // Find tasks 15, 16, 17 by sortOrder
    const task15Template = tasksData.find((t: any) => t.sortOrder === 15);
    const task16Template = tasksData.find((t: any) => t.sortOrder === 16);
    const task17Template = tasksData.find((t: any) => t.sortOrder === 17);

    if (!task15Template || !task16Template || !task17Template) {
      return NextResponse.json({
        success: false,
        error: 'Could not find all tasks (15, 16, 17) in the JSON file'
      }, { status: 400 });
    }

    // Get all company tasks for sortOrders 15, 16, 17
    const tasksRef = collection(db, 'companyTasks');
    const q = query(tasksRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const companyTasks: any[] = [];
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.sortOrder === 15 || data.sortOrder === 16 || data.sortOrder === 17) {
        companyTasks.push({ id: docSnap.id, ...data });
      }
    });

    const results = [];

    for (const task of companyTasks) {
      let template;
      if (task.sortOrder === 15) template = task15Template;
      else if (task.sortOrder === 16) template = task16Template;
      else if (task.sortOrder === 17) template = task17Template;

      if (!template) continue;

      const taskRef = doc(db, 'companyTasks', task.id);
      await updateDoc(taskRef, {
        systemPrompt: template.systemPrompt,
        testCriteria: template.testCriteria,
        updatedAt: new Date()
      });

      results.push({
        sortOrder: task.sortOrder,
        taskName: task.taskName,
        id: task.id,
        updated: true
      });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} tasks`,
      results
    });

  } catch (error: any) {
    console.error('Error updating tasks:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
