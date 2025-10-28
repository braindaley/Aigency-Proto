import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSubmissionsFromArtifacts } from '@/lib/submission-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, taskId, taskName, dependencyTaskIds } = body;

    if (!companyId || !taskId || !taskName || !dependencyTaskIds || !Array.isArray(dependencyTaskIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, taskId, taskName, dependencyTaskIds' },
        { status: 400 }
      );
    }

    if (dependencyTaskIds.length === 0) {
      return NextResponse.json(
        { error: 'No dependency tasks provided' },
        { status: 400 }
      );
    }

    // Get all artifacts from dependency tasks
    const allArtifacts: Array<{ id: string; title: string; content: string; carrierName?: string }> = [];

    for (const depTaskId of dependencyTaskIds) {
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const q = query(artifactsRef, where('taskId', '==', depTaskId));
      const snapshot = await getDocs(q);

      const artifacts = snapshot.docs
        .map(doc => {
          const data = doc.data();
          // Try to extract carrier name from various sources
          let carrierName = data.carrierName || data.name || '';

          // If no explicit carrier name, try to extract from content
          if (!carrierName && data.data) {
            // Look for patterns like "Carrier: XYZ" or "Company: XYZ" at the beginning
            const carrierMatch = data.data.match(/(?:Carrier|Company|To):\s*([^\n]+)/i);
            if (carrierMatch) {
              carrierName = carrierMatch[1].trim();
            }
          }

          return {
            id: doc.id,
            title: data.name || '',
            content: data.data || '',
            carrierName
          };
        })
        .filter(a => a.carrierName && a.content && a.content.length > 100); // Only include artifacts with carrier names and substantial content

      allArtifacts.push(...artifacts);
    }

    if (allArtifacts.length === 0) {
      return NextResponse.json(
        { error: 'No carrier-specific artifacts found in dependency tasks' },
        { status: 404 }
      );
    }

    // Gather attachments from all completed tasks in the company
    // These typically include: ACORD 125, ACORD 130, loss runs, narrative, coverage suggestions
    const attachments: any[] = [];
    const completedTasksRef = collection(db, 'companyTasks');
    const completedTasksQuery = query(
      completedTasksRef,
      where('companyId', '==', companyId),
      where('status', '==', 'completed')
    );
    const completedTasksSnapshot = await getDocs(completedTasksQuery);

    // Key artifacts to attach: ACORDs, loss runs, narrative, coverage suggestions
    const attachmentKeywords = ['acord', 'loss run', 'narrative', 'coverage suggestion', 'payroll', 'application'];

    for (const taskDoc of completedTasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const taskName = (taskData.taskName || '').toLowerCase();

      // Check if this task produces documents we want to attach
      const isAttachmentSource = attachmentKeywords.some(keyword => taskName.includes(keyword));

      if (isAttachmentSource) {
        const taskArtifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const taskArtifactsQuery = query(taskArtifactsRef, where('taskId', '==', taskDoc.id));
        const taskArtifactsSnapshot = await getDocs(taskArtifactsQuery);

        taskArtifactsSnapshot.forEach(artifactDoc => {
          const artifactData = artifactDoc.data();
          attachments.push({
            id: artifactDoc.id,
            name: artifactData.name || taskData.taskName,
            type: artifactData.type || 'text',
            url: `/companies/${companyId}/artifacts/${artifactDoc.id}`, // Reference to artifact
            taskName: taskData.taskName
          });
        });
      }
    }

    console.log(`📎 Found ${attachments.length} attachments to include with submissions`);

    // Create submissions
    const submissionIds = await createSubmissionsFromArtifacts({
      companyId,
      taskId,
      taskName,
      artifacts: allArtifacts,
      attachments
    });

    console.log(`✅ Created ${submissionIds.length} submissions from ${dependencyTaskIds.length} dependency task(s)`);

    return NextResponse.json({
      success: true,
      count: submissionIds.length,
      submissionIds,
      artifacts: allArtifacts.map(a => ({
        carrierName: a.carrierName,
        title: a.title
      }))
    });
  } catch (error) {
    console.error('Error creating submissions from dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to create submissions' },
      { status: 500 }
    );
  }
}
