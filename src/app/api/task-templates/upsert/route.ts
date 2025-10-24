import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';

// Helper to log audit trail
async function logAuditTrail(
  templateId: string,
  templateName: string,
  action: 'create' | 'update',
  changes: any[],
  userId?: string,
  userEmail?: string
) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/task-templates/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId,
        templateName,
        action,
        changes,
        userId,
        userEmail,
      }),
    });
  } catch (error) {
    console.error('Failed to log audit trail:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { templateId, taskData, userId, userEmail } = await request.json();

    if (!templateId || !taskData) {
      return NextResponse.json(
        { error: 'Missing templateId or taskData' },
        { status: 400 }
      );
    }

    // Check if template exists (for audit trail)
    const taskRef = doc(db, 'tasks', templateId);
    const existingDoc = await getDoc(taskRef);
    const isNewTemplate = !existingDoc.exists();
    const existingData = existingDoc.data();

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

    // Track changes for audit log
    const changes = [];
    if (!isNewTemplate && existingData) {
      Object.keys(templateData).forEach(key => {
        if (key !== 'updatedAt' && key !== 'createdAt') {
          const oldValue = existingData[key];
          const newValue = taskData[key];

          // Check if value changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              field: key,
              oldValue,
              newValue,
            });
          }
        }
      });
    }

    // Save to the tasks collection (templates)
    await setDoc(taskRef, templateData, { merge: true });

    console.log(`✅ Template ${templateId} saved to Firebase`);

    // Clear template cache so all company tasks get updates immediately
    DataService.clearTemplateCache();
    console.log(`🔄 Template cache cleared - updates will apply to all company tasks`);

    // Log to audit trail
    await logAuditTrail(
      templateId,
      taskData.taskName || templateId,
      isNewTemplate ? 'create' : 'update',
      changes,
      userId,
      userEmail
    );

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