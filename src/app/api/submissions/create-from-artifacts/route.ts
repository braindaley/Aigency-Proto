import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSubmissionsFromArtifacts } from '@/lib/submission-utils';
import { parseMultipleArtifacts } from '@/lib/artifact-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, taskId, taskName } = body;

    if (!companyId || !taskId || !taskName) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, taskId, taskName' },
        { status: 400 }
      );
    }

    // Get all artifacts for this task
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const q = query(artifactsRef, where('taskId', '==', taskId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No artifacts found for this task' },
        { status: 404 }
      );
    }

    // Convert artifacts to the format needed
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

    if (artifacts.length === 0) {
      return NextResponse.json(
        { error: 'No carrier-specific artifacts found' },
        { status: 404 }
      );
    }

    // Create submissions
    const submissionIds = await createSubmissionsFromArtifacts({
      companyId,
      taskId,
      taskName,
      artifacts,
      attachments: [] // Can be enhanced to include actual attachments
    });

    console.log(`✅ Created ${submissionIds.length} submissions from artifacts`);

    return NextResponse.json({
      success: true,
      count: submissionIds.length,
      submissionIds
    });
  } catch (error) {
    console.error('Error creating submissions from artifacts:', error);
    return NextResponse.json(
      { error: 'Failed to create submissions' },
      { status: 500 }
    );
  }
}
