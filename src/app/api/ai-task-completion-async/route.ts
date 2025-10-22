/**
 * Async AI Task Completion API
 *
 * This endpoint queues an AI task for background processing and returns immediately.
 * It works within Netlify's 10-second timeout limit by:
 * 1. Validating the request (fast)
 * 2. Creating a job document in Firestore (fast)
 * 3. Triggering background processing (non-blocking)
 * 4. Returning HTTP 202 Accepted immediately
 *
 * The frontend uses Firestore real-time listeners to track progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AITaskWorker } from '@/lib/ai-task-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // We only need 10s since we return immediately

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 AI-TASK-ASYNC: Request received`);

  try {
    const { taskId, companyId } = await request.json();

    if (!taskId || !companyId) {
      console.error(`[${timestamp}] ❌ AI-TASK-ASYNC: Missing required parameters`);
      return NextResponse.json(
        { error: 'Missing taskId or companyId' },
        { status: 400 }
      );
    }

    console.log(`[${timestamp}] 📋 AI-TASK-ASYNC: Queueing taskId=${taskId}, companyId=${companyId}`);

    // Create a job document in Firestore for progress tracking
    const jobRef = doc(db, 'aiTaskJobs', taskId);
    await setDoc(jobRef, {
      taskId,
      companyId,
      status: 'queued',
      progress: 'Task queued for processing...',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`[${timestamp}] ✅ AI-TASK-ASYNC: Job created in Firestore`);

    // Trigger background processing (non-blocking)
    // This runs asynchronously and won't block the response
    AITaskWorker.processTask(taskId, companyId).catch(error => {
      console.error(`[${timestamp}] ❌ AI-TASK-ASYNC: Background processing error:`, error);
    });

    console.log(`[${timestamp}] 🎯 AI-TASK-ASYNC: Background worker triggered`);

    // Return immediately with HTTP 202 Accepted
    return NextResponse.json(
      {
        success: true,
        status: 'queued',
        message: 'AI task queued for processing. Monitor the job status in Firestore.',
        jobId: taskId,
        trackingPath: `aiTaskJobs/${taskId}`
      },
      { status: 202 } // 202 Accepted - request accepted but processing not complete
    );

  } catch (error) {
    console.error(`[${timestamp}] ❌ AI-TASK-ASYNC ERROR:`, error);
    return NextResponse.json(
      {
        error: 'Failed to queue AI task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
