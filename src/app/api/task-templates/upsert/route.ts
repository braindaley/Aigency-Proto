import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { templateId, taskData } = await request.json();

    if (!templateId || !taskData) {
      return NextResponse.json(
        { error: 'Missing templateId or taskData' },
        { status: 400 }
      );
    }

    // Prepare the template data with all fields
    const templateData = {
      // Core task information
      taskName: taskData.taskName || '',
      description: taskData.description || '',
      systemPrompt: taskData.systemPrompt || '',
      testCriteria: taskData.testCriteria || '',

      // Policy and phase information
      policyType: taskData.policyType || 'workers-comp',
      phase: taskData.phase || '',
      tag: taskData.tag || '',

      // Status and workflow
      status: taskData.status || 'Upcoming',
      dependencies: taskData.dependencies || [],
      subtasks: taskData.subtasks || [],
      sortOrder: taskData.sortOrder || 0,

      // Configuration
      showDependencyArtifacts: taskData.showDependencyArtifacts || false,

      // Timestamps
      updatedAt: serverTimestamp(),
      createdAt: taskData.createdAt || serverTimestamp(),
    };

    // Save to the tasks collection (templates)
    const taskRef = doc(db, 'tasks', templateId);
    await setDoc(taskRef, templateData, { merge: true });

    console.log(`✅ Template ${templateId} saved to Firebase`);

    return NextResponse.json({
      success: true,
      message: `Template ${templateId} successfully saved`,
      templateId
    });

  } catch (error) {
    console.error('Error saving task template:', error);
    return NextResponse.json(
      { error: 'Failed to save task template' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Task template upsert endpoint - use POST to save templates' });
}