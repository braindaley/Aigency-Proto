import { NextRequest, NextResponse } from 'next/server';
import { collection, query, getDocs, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const companyId = 'qsu1QXPB8TUK2P4QyDiy';

    // Get a submission from the company
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const q = query(submissionsRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'No submissions found'
      }, { status: 404 });
    }

    // Get the first submission
    const firstSubmission = snapshot.docs[0];
    const submissionData = firstSubmission.data();

    // Add a reply - only include defined fields
    const reply: any = {
      from: submissionData.contactEmail || 'underwriter@carrier.com',
      fromName: `${submissionData.carrierName || 'Carrier'} Underwriter`,
      receivedAt: Timestamp.now(),
      subject: 'RE: Workers\' Compensation Submission',
      body: 'Can you provide more details on the safety training program for the framing crews? Specifically, what type of fall protection training is provided and how often is it conducted?',
      bodyHtml: '<p>Can you provide more details on the safety training program for the framing crews? Specifically, what type of fall protection training is provided and how often is it conducted?</p>',
      responded: false
    };

    const submissionRef = doc(db, `companies/${companyId}/submissions`, firstSubmission.id);

    // Get current replies array or initialize as empty
    const currentReplies = submissionData.replies || [];

    await updateDoc(submissionRef, {
      replies: [...currentReplies, reply],
      status: 'replied',
      lastReplyAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return NextResponse.json({
      success: true,
      message: 'Test reply added successfully',
      submissionId: firstSubmission.id,
      carrierName: submissionData.carrierName
    });

  } catch (error: any) {
    console.error('Error adding test reply:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
