import { NextRequest, NextResponse } from 'next/server';
import { syncTaskWithTemplate } from '@/lib/task-template-sync';

/**
 * API endpoint to manually sync a task with its template
 *
 * POST /api/sync-task-template
 * Body: { taskId: string, force?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, force = false } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Syncing task ${taskId} with template (force: ${force})`);

    const result = await syncTaskWithTemplate(taskId, { force });

    if (result.error) {
      return NextResponse.json(
        { error: result.error, result },
        { status: 400 }
      );
    }

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: result.skipReason || 'Task sync skipped',
        synced: false,
        result
      });
    }

    return NextResponse.json({
      success: true,
      message: result.synced
        ? `Successfully synced ${result.updatedFields.length} field(s)`
        : 'Task already up to date',
      synced: result.synced,
      updatedFields: result.updatedFields,
      result
    });

  } catch (error) {
    console.error('[API] Error syncing task with template:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync task with template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
