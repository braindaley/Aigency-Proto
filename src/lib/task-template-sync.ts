/**
 * Task Template Synchronization Utility
 *
 * This module provides functionality to sync task instances with their templates.
 * When a template is updated, existing tasks can pull the latest template data
 * without needing to be deleted and recreated.
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/lib/types';

/**
 * Fields that should be synced from template to task instance
 * These are the fields that define the task's behavior and UI
 */
const SYNCABLE_FIELDS = [
  'systemPrompt',
  'testCriteria',
  'showDependencyArtifacts',
  'interfaceType',
  'description',
  'predefinedButtons',
  'dependencies',
] as const;

export interface TaskTemplateSyncOptions {
  /**
   * Force sync even if task has been modified
   * Default: false (only sync if task hasn't been customized)
   */
  force?: boolean;

  /**
   * Fields to sync. If not provided, syncs all SYNCABLE_FIELDS
   */
  fieldsToSync?: string[];

  /**
   * Callback to log sync operations
   */
  onLog?: (message: string) => void;
}

export interface TaskTemplateSyncResult {
  synced: boolean;
  updatedFields: string[];
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Syncs a task instance with its template
 *
 * @param taskId - The ID of the task to sync
 * @param options - Sync options
 * @returns Result of the sync operation
 */
export async function syncTaskWithTemplate(
  taskId: string,
  options: TaskTemplateSyncOptions = {}
): Promise<TaskTemplateSyncResult> {
  const { force = false, fieldsToSync, onLog } = options;

  const log = (message: string) => {
    if (onLog) onLog(message);
    console.log(`[TaskTemplateSync] ${message}`);
  };

  try {
    log(`Starting sync for task ${taskId}`);

    // Fetch the task
    const taskRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      return {
        synced: false,
        updatedFields: [],
        error: 'Task not found'
      };
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Check if task has a templateId
    if (!task.templateId) {
      log('Task has no templateId, skipping sync');
      return {
        synced: false,
        updatedFields: [],
        skipped: true,
        skipReason: 'No templateId found'
      };
    }

    // Fetch the template
    const templateRef = doc(db, 'tasks', task.templateId.toString());
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      log(`Template ${task.templateId} not found`);
      return {
        synced: false,
        updatedFields: [],
        error: 'Template not found'
      };
    }

    const template = templateDoc.data() as Task;
    log(`Found template: ${template.taskName}`);

    // Determine which fields to sync
    const fieldsToUpdate = fieldsToSync || SYNCABLE_FIELDS;
    const updatedFields: string[] = [];
    const updates: Record<string, any> = {};

    // Compare and collect changes
    for (const field of fieldsToUpdate) {
      const templateValue = (template as any)[field];
      const taskValue = (task as any)[field];

      // Skip if template doesn't have this field
      if (templateValue === undefined) {
        continue;
      }

      // Check if values differ
      const isDifferent = JSON.stringify(templateValue) !== JSON.stringify(taskValue);

      if (isDifferent) {
        updates[field] = templateValue;
        updatedFields.push(field);
        log(`Will update ${field}: ${JSON.stringify(taskValue)} → ${JSON.stringify(templateValue)}`);
      }
    }

    // If no changes, return early
    if (updatedFields.length === 0) {
      log('No changes detected, task is already up to date');
      return {
        synced: false,
        updatedFields: [],
        skipped: true,
        skipReason: 'Task already up to date'
      };
    }

    // Update the task
    log(`Updating ${updatedFields.length} field(s): ${updatedFields.join(', ')}`);
    await updateDoc(taskRef, {
      ...updates,
      lastSyncedAt: new Date(),
      lastSyncedTemplateId: task.templateId
    });

    log('Sync completed successfully');
    return {
      synced: true,
      updatedFields
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Sync failed: ${errorMessage}`);
    return {
      synced: false,
      updatedFields: [],
      error: errorMessage
    };
  }
}

/**
 * Checks if a task needs to be synced with its template
 * This is a lightweight check that doesn't fetch the full template
 *
 * @param taskId - The ID of the task to check
 * @returns true if task should be synced
 */
export async function shouldSyncTask(taskId: string): Promise<boolean> {
  try {
    const taskRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      return false;
    }

    const task = taskDoc.data();

    // Skip if no templateId
    if (!task.templateId) {
      return false;
    }

    // Always sync if never synced before
    if (!task.lastSyncedAt) {
      return true;
    }

    // Check if template might have been updated
    // This is a simple heuristic - you could make this more sophisticated
    const lastSyncedAt = task.lastSyncedAt?.toDate() || new Date(0);
    const hoursSinceSync = (Date.now() - lastSyncedAt.getTime()) / (1000 * 60 * 60);

    // Sync if it's been more than 1 hour (or on every page load in dev)
    return hoursSinceSync > 1 || process.env.NODE_ENV === 'development';
  } catch (error) {
    console.error('[TaskTemplateSync] Error checking sync status:', error);
    return false;
  }
}

/**
 * Auto-sync task with template on page load
 * This is meant to be called from task detail pages
 *
 * @param taskId - The ID of the task
 * @param silent - If true, doesn't log to console (default: false)
 */
export async function autoSyncTaskOnLoad(taskId: string, silent = false): Promise<TaskTemplateSyncResult> {
  const shouldSync = await shouldSyncTask(taskId);

  if (!shouldSync) {
    if (!silent) {
      console.log(`[TaskTemplateSync] Skipping sync for task ${taskId} (recently synced)`);
    }
    return {
      synced: false,
      updatedFields: [],
      skipped: true,
      skipReason: 'Recently synced'
    };
  }

  return syncTaskWithTemplate(taskId, {
    onLog: silent ? undefined : console.log
  });
}
