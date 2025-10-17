import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Submission, SubmissionStatus, SubmissionAttachment } from '@/lib/types';

/**
 * Create a submission from an artifact
 */
export async function createSubmissionFromArtifact({
  companyId,
  taskId,
  taskName,
  carrierName,
  carrierEmail,
  subject,
  body,
  attachments = [],
  status = 'draft'
}: {
  companyId: string;
  taskId: string;
  taskName: string;
  carrierName: string;
  carrierEmail: string;
  subject: string;
  body: string;
  attachments?: SubmissionAttachment[];
  status?: SubmissionStatus;
}): Promise<string> {
  try {
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);

    const submissionData = {
      companyId,
      taskId,
      taskName,
      carrierName,
      carrierEmail,
      subject,
      body,
      attachments,
      status,
      replies: [],
      tracking: {
        opens: 0,
        clicks: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(submissionsRef, submissionData);
    console.log('✅ Submission created:', docRef.id, 'for', carrierName);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    throw error;
  }
}

/**
 * Create multiple submissions from artifacts
 */
export async function createSubmissionsFromArtifacts({
  companyId,
  taskId,
  taskName,
  artifacts,
  attachments = []
}: {
  companyId: string;
  taskId: string;
  taskName: string;
  artifacts: Array<{
    id: string;
    title: string;
    content: string;
    carrierName?: string;
  }>;
  attachments?: SubmissionAttachment[];
}): Promise<string[]> {
  const submissionIds: string[] = [];

  for (const artifact of artifacts) {
    // Extract subject from first line or use default
    const lines = artifact.content.trim().split('\n');
    const subjectLine = lines.find(line => line.toLowerCase().startsWith('subject:'));
    const subject = subjectLine
      ? subjectLine.replace(/^subject:\s*/i, '').trim()
      : `${taskName} - ${artifact.carrierName || 'Submission'}`;

    // Extract carrier email from content or use placeholder
    const emailMatch = artifact.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const carrierEmail = emailMatch ? emailMatch[0] : `underwriter@${(artifact.carrierName || 'carrier').toLowerCase().replace(/\s+/g, '')}.com`;

    try {
      const submissionId = await createSubmissionFromArtifact({
        companyId,
        taskId,
        taskName,
        carrierName: artifact.carrierName || artifact.title,
        carrierEmail,
        subject,
        body: artifact.content,
        attachments,
        status: 'ready' // Mark as ready to send
      });

      submissionIds.push(submissionId);
    } catch (error) {
      console.error(`Failed to create submission for ${artifact.carrierName}:`, error);
    }
  }

  console.log(`✅ Created ${submissionIds.length} of ${artifacts.length} submissions`);
  return submissionIds;
}

/**
 * Get all submissions for a task
 */
export async function getSubmissionsForTask(companyId: string, taskId: string): Promise<Submission[]> {
  try {
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    // Remove orderBy to avoid composite index requirement
    const q = query(
      submissionsRef,
      where('taskId', '==', taskId)
    );
    const snapshot = await getDocs(q);

    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Submission[];

    // Sort in memory
    submissions.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return submissions;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

/**
 * Get all submissions for a company
 */
export async function getSubmissions(companyId: string, status?: SubmissionStatus): Promise<Submission[]> {
  try {
    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    let q;

    if (status) {
      // Remove orderBy to avoid composite index requirement
      q = query(
        submissionsRef,
        where('status', '==', status)
      );
    } else {
      q = query(submissionsRef);
    }

    const snapshot = await getDocs(q);

    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Submission[];

    // Sort in memory
    submissions.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return submissions;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  companyId: string,
  submissionId: string,
  status: SubmissionStatus,
  additionalData?: Partial<Submission>
): Promise<void> {
  try {
    const submissionRef = doc(db, `companies/${companyId}/submissions`, submissionId);
    await updateDoc(submissionRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Submission status updated:', submissionId, status);
  } catch (error) {
    console.error('❌ Error updating submission status:', error);
    throw error;
  }
}

/**
 * Mark submission as sent
 */
export async function markSubmissionAsSent(
  companyId: string,
  submissionId: string,
  emailId: string,
  sentBy?: string
): Promise<void> {
  await updateSubmissionStatus(companyId, submissionId, 'sent', {
    emailId,
    sentBy,
    sentAt: Timestamp.now(),
    'tracking.deliveredAt': Timestamp.now()
  } as any);
}

/**
 * Record email open
 */
export async function recordEmailOpen(companyId: string, submissionId: string): Promise<void> {
  try {
    const submissionRef = doc(db, `companies/${companyId}/submissions`, submissionId);
    const submission = await getDocs(query(collection(db, `companies/${companyId}/submissions`), where('id', '==', submissionId)));

    if (!submission.empty) {
      const currentData = submission.docs[0].data();
      const currentOpens = currentData.tracking?.opens || 0;

      await updateDoc(submissionRef, {
        status: 'opened',
        'tracking.opens': currentOpens + 1,
        'tracking.lastOpenedAt': Timestamp.now(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Email open recorded:', submissionId);
    }
  } catch (error) {
    console.error('❌ Error recording email open:', error);
  }
}

/**
 * Extract carrier email from email body content
 */
export function extractCarrierEmail(content: string): string | null {
  // Look for email in "Dear" line
  const dearMatch = content.match(/Dear\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (dearMatch) return dearMatch[1];

  // Look for any email address in the content
  const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : null;
}
