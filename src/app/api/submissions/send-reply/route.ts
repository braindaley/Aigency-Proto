import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { submissionId, companyId, replyIndex, responseBody } = await request.json();

    if (!submissionId || !companyId || replyIndex === undefined || !responseBody) {
      return NextResponse.json({
        error: 'Missing required fields: submissionId, companyId, replyIndex, responseBody'
      }, { status: 400 });
    }

    // Get the submission to find the reply
    const submissionRef = doc(db, `companies/${companyId}/submissions`, submissionId);
    const submissionSnap = await getDoc(submissionRef);

    if (!submissionSnap.exists()) {
      return NextResponse.json({
        error: 'Submission not found'
      }, { status: 404 });
    }

    const submissionData = submissionSnap.data();
    const replies = submissionData.replies || [];

    if (replyIndex < 0 || replyIndex >= replies.length) {
      return NextResponse.json({
        error: 'Invalid reply index'
      }, { status: 400 });
    }

    // Update the specific reply with the response
    replies[replyIndex] = {
      ...replies[replyIndex],
      responded: true,
      responseBody,
      respondedAt: Timestamp.now()
    };

    // Update the submission with the modified replies array
    await updateDoc(submissionRef, {
      replies,
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Response sent for submission ${submissionId}, reply ${replyIndex}`);

    return NextResponse.json({
      success: true,
      message: 'Response sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending reply:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send reply'
    }, { status: 500 });
  }
}
