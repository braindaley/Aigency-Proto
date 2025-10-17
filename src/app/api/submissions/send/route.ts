import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendMockEmail } from '@/lib/mock-email-service';
import type { Submission } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, submissionId } = body;

    if (!companyId || !submissionId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, submissionId' },
        { status: 400 }
      );
    }

    // Get the submission
    const submissionRef = doc(db, `companies/${companyId}/submissions`, submissionId);
    const submissionSnap = await getDoc(submissionRef);

    if (!submissionSnap.exists()) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const submission = { id: submissionSnap.id, ...submissionSnap.data() } as Submission;

    // Check if already sent
    if (submission.status === 'sent' || submission.status === 'sending') {
      return NextResponse.json(
        { error: 'Submission already sent or in progress' },
        { status: 400 }
      );
    }

    // Update status to sending
    await updateDoc(submissionRef, {
      status: 'sending',
      updatedAt: serverTimestamp()
    });

    // Send mock email
    const emailResult = await sendMockEmail({
      to: submission.carrierEmail,
      from: 'submissions@orionrisk.com', // Mock sender
      subject: submission.subject,
      body: submission.body,
      attachments: submission.attachments
    });

    if (!emailResult.success) {
      // Mark as failed
      await updateDoc(submissionRef, {
        status: 'failed',
        notes: emailResult.message,
        updatedAt: serverTimestamp()
      });

      return NextResponse.json(
        { error: emailResult.message },
        { status: 500 }
      );
    }

    // Mark as sent
    await updateDoc(submissionRef, {
      status: 'sent',
      emailId: emailResult.emailId,
      sentAt: Timestamp.now(),
      sentBy: 'current-user', // In production, get from auth
      'tracking.deliveredAt': Timestamp.now(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ Submission sent:', submissionId, 'to', submission.carrierEmail);

    return NextResponse.json({
      success: true,
      emailId: emailResult.emailId,
      message: 'Submission sent successfully',
      estimatedDeliveryTime: emailResult.estimatedDeliveryTime
    });
  } catch (error) {
    console.error('Error sending submission:', error);
    return NextResponse.json(
      { error: 'Failed to send submission' },
      { status: 500 }
    );
  }
}
