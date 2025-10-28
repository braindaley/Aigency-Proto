import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

    // Get all submissions for this task
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const q = query(submissionsRef, where('taskId', '==', taskId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No submissions found for this task' },
        { status: 404 }
      );
    }

    // Update all submissions to "sent" status
    const updates = snapshot.docs.map(async (submissionDoc) => {
      await updateDoc(doc(db, `companies/${companyId}/submissions`, submissionDoc.id), {
        status: 'sent',
        sentAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await Promise.all(updates);

    console.log(`✅ Sent ${snapshot.size} email(s) for task ${taskId}`);

    return NextResponse.json({
      success: true,
      count: snapshot.size,
      message: `Successfully sent ${snapshot.size} email(s)`
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
