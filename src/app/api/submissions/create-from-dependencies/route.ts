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
          return {
            id: doc.id,
            title: data.name || '',
            content: data.data || '',
            carrierName: data.carrierName || data.name
          };
        })
        .filter(a => a.carrierName && a.content); // Only include artifacts with carrier names

      allArtifacts.push(...artifacts);
    }

    if (allArtifacts.length === 0) {
      return NextResponse.json(
        { error: 'No carrier-specific artifacts found in dependency tasks' },
        { status: 404 }
      );
    }

    // Create submissions
    const submissionIds = await createSubmissionsFromArtifacts({
      companyId,
      taskId,
      taskName,
      artifacts: allArtifacts,
      attachments: [] // Can be enhanced to include actual attachments
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
