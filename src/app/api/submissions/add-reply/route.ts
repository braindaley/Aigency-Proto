import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { submissionId, companyId, reply } = await request.json();

    if (!submissionId || !companyId || !reply) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const submissionRef = doc(db, `companies/${companyId}/submissions`, submissionId);

    // Add reply to submission and update status
    await updateDoc(submissionRef, {
      replies: arrayUnion({
        from: reply.from || 'underwriter@carrier.com',
        fromName: reply.fromName || 'Underwriter',
        receivedAt: Timestamp.now(),
        subject: reply.subject || 'RE: Workers\' Compensation Submission',
        body: reply.body,
        bodyHtml: reply.bodyHtml || reply.body,
        attachments: reply.attachments || []
      }),
      status: 'replied',
      lastReplyAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Added reply to submission ${submissionId}`);

    return NextResponse.json({
      success: true,
      message: 'Reply added successfully'
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    return NextResponse.json(
      { error: 'Failed to add reply' },
      { status: 500 }
    );
  }
}
