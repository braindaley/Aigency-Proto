import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendMockEmailBatch } from '@/lib/mock-email-service';
import type { Submission } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, taskId } = body;

    if (!companyId || !taskId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, taskId' },
        { status: 400 }
      );
    }

    // Get all submissions for this task that are ready to send
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const q = query(
      submissionsRef,
      where('taskId', '==', taskId),
      where('status', 'in', ['ready', 'draft', 'failed'])
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No submissions ready to send' },
        { status: 404 }
      );
    }

    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Submission[];

    console.log(`📧 Sending ${submissions.length} submissions...`);

    // Update all to "sending" status
    await Promise.all(
      submissions.map(submission =>
        updateDoc(doc(db, `companies/${companyId}/submissions`, submission.id), {
          status: 'sending',
          updatedAt: serverTimestamp()
        })
      )
    );

    // Send all emails in batch
    const emailResults = await sendMockEmailBatch(
      submissions.map(submission => ({
        to: submission.carrierEmail,
        from: 'submissions@orionrisk.com',
        subject: submission.subject,
        body: submission.body,
        attachments: submission.attachments
      }))
    );

    // Update statuses based on results
    const updatePromises = emailResults.map((result, index) => {
      const submission = submissions[index];
      const submissionRef = doc(db, `companies/${companyId}/submissions`, submission.id);

      if (result.success) {
        return updateDoc(submissionRef, {
          status: 'sent',
          emailId: result.emailId,
          sentAt: Timestamp.now(),
          sentBy: 'current-user',
          'tracking.deliveredAt': Timestamp.now(),
          updatedAt: serverTimestamp()
        });
      } else {
        return updateDoc(submissionRef, {
          status: 'failed',
          notes: result.message,
          updatedAt: serverTimestamp()
        });
      }
    });

    await Promise.all(updatePromises);

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.length - successCount;

    console.log(`✅ Sent ${successCount} submissions, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      total: submissions.length,
      sent: successCount,
      failed: failureCount,
      results: emailResults.map((result, index) => ({
        carrierName: submissions[index].carrierName,
        ...result
      }))
    });
  } catch (error) {
    console.error('Error sending submissions:', error);
    return NextResponse.json(
      { error: 'Failed to send submissions' },
      { status: 500 }
    );
  }
}
