# Task Template Synchronization

This document explains the task template synchronization feature, which automatically updates existing task instances when their templates are modified.

## Overview

Previously, when you updated a task template (e.g., changed the `systemPrompt`, `testCriteria`, or `interfaceType`), existing tasks created from that template would not reflect the changes. You had to delete all tasks and recreate them to see the updates.

Now, with the template sync feature, tasks automatically pull the latest template data when:
1. The task page loads or refreshes
2. The AI task worker processes the task
3. You manually trigger a sync via the API

## How It Works

### 1. Template Linking

When tasks are created from templates, they store a `templateId` field that links back to the template:

```typescript
const newCompanyTask = {
  ...templateData,
  templateId: template.id,  // Links to the template
  companyId: companyId,
  // ... other fields
};
```

### 2. Syncable Fields

The following fields are automatically synced from template to task:

- `systemPrompt` - The AI instructions for completing the task
- `testCriteria` - Validation criteria for task completion
- `showDependencyArtifacts` - Whether to show dependency artifacts (deprecated)
- `interfaceType` - UI interface type (chat, artifact, or email)
- `description` - Task description
- `predefinedButtons` - Quick action buttons
- `dependencies` - Task dependencies

### 3. Automatic Sync Points

#### On Page Load/Refresh

When you open a task page or refresh it, the task automatically syncs with its template:

```typescript
// src/app/companies/[id]/tasks/[taskId]/page.tsx
const syncResult = await autoSyncTaskOnLoad(taskId, true);
if (syncResult.synced) {
  console.log('🔄 Task synced with template:', syncResult.updatedFields.join(', '));
}
```

#### Before AI Processing

When the AI task worker processes a task, it first syncs with the template to ensure it has the latest instructions:

```typescript
// src/lib/ai-task-worker.ts
const syncResult = await syncTaskWithTemplate(taskId, { force: false });
if (syncResult.synced) {
  console.log('🔄 AI-TASK-WORKER: Task synced with template');
}
```

### 4. Smart Syncing

The sync system is smart about when to sync:

- **Cooldown Period**: Tasks are not re-synced if they were synced within the last hour (except in development mode)
- **Change Detection**: Only updates fields that actually differ between task and template
- **Metadata Tracking**: Stores `lastSyncedAt` and `lastSyncedTemplateId` to track sync history

## Usage

### Automatic Syncing (Recommended)

Just refresh the task page! The sync happens automatically in the background.

```bash
# 1. Update your task template in the UI
# 2. Navigate to any task page
# 3. The task will automatically sync with the updated template
# 4. Refresh the page to see the changes reflected
```

### Manual Syncing via API

You can manually trigger a sync using the API endpoint:

```bash
curl -X POST http://localhost:9003/api/sync-task-template \
  -H "Content-Type: application/json" \
  -d '{"taskId": "YOUR_TASK_ID", "force": false}'
```

Response:
```json
{
  "success": true,
  "message": "Successfully synced 2 field(s)",
  "synced": true,
  "updatedFields": ["systemPrompt", "testCriteria"],
  "result": {
    "synced": true,
    "updatedFields": ["systemPrompt", "testCriteria"]
  }
}
```

### Testing with Script

Use the test script to verify syncing for a specific task:

```bash
npx tsx scripts/test-task-sync.ts <taskId>
```

Example output:
```
🔄 Testing sync for task: abc123

   [TaskTemplateSync] Starting sync for task abc123
   [TaskTemplateSync] Found template: Workers' Comp Application
   [TaskTemplateSync] Will update systemPrompt: "..." → "..."
   [TaskTemplateSync] Will update testCriteria: "..." → "..."
   [TaskTemplateSync] Updating 2 field(s): systemPrompt, testCriteria
   [TaskTemplateSync] Sync completed successfully

📊 Sync Result:
   Synced: true
   Updated Fields: systemPrompt, testCriteria

✅ Test complete!
```

### Programmatic Usage

```typescript
import { syncTaskWithTemplate, autoSyncTaskOnLoad } from '@/lib/task-template-sync';

// Manual sync with options
const result = await syncTaskWithTemplate(taskId, {
  force: false,  // Skip if recently synced
  fieldsToSync: ['systemPrompt', 'testCriteria'],  // Only sync specific fields
  onLog: (msg) => console.log(msg)  // Custom logging
});

// Auto sync (recommended for page loads)
const result = await autoSyncTaskOnLoad(taskId, silent = true);
```

## Sync Result Object

```typescript
interface TaskTemplateSyncResult {
  synced: boolean;           // Whether any fields were updated
  updatedFields: string[];   // List of fields that were updated
  error?: string;            // Error message if sync failed
  skipped?: boolean;         // Whether sync was skipped
  skipReason?: string;       // Reason for skipping
}
```

## Common Scenarios

### Scenario 1: Updating AI Instructions

1. Go to Task Settings and edit a template's `systemPrompt`
2. Save the template
3. Navigate to any task created from that template
4. The task automatically syncs and uses the new instructions
5. Run the AI task worker - it will use the updated instructions

### Scenario 2: Changing Interface Type

1. Update a template's `interfaceType` from 'chat' to 'artifact'
2. Refresh the task page
3. The task UI automatically switches to the artifact interface

### Scenario 3: Updating Test Criteria

1. Update a template's `testCriteria`
2. Next time the AI processes the task, it will validate against the new criteria
3. No need to delete and recreate tasks

## Troubleshooting

### Task Not Syncing?

Check the browser console for sync logs:
```
🔄 Task synced with template: systemPrompt, testCriteria
```

If you see "Recently synced" or "Task already up to date", the sync is working correctly.

### Force a Sync

To bypass the cooldown period and force a sync:

```typescript
const result = await syncTaskWithTemplate(taskId, { force: true });
```

Or via API:
```bash
curl -X POST http://localhost:9003/api/sync-task-template \
  -H "Content-Type: application/json" \
  -d '{"taskId": "YOUR_TASK_ID", "force": true}'
```

### Template Not Found

If you see "Template not found", the task may have been created without a `templateId`. This happens for manually created tasks or legacy tasks. These tasks won't sync automatically.

## Architecture

```
┌─────────────────┐
│  Task Template  │  (in 'tasks' collection)
└────────┬────────┘
         │ templateId reference
         │
         ├─────────────┐
         │             │
         ▼             ▼
┌─────────────┐  ┌─────────────┐
│ Company Task│  │ Company Task│  (in 'companyTasks' collection)
│   (synced)  │  │   (synced)  │
└─────────────┘  └─────────────┘
```

## Files Changed

- **[src/lib/task-template-sync.ts](src/lib/task-template-sync.ts)** - Core sync logic
- **[src/app/companies/[id]/tasks/[taskId]/page.tsx](src/app/companies/[id]/tasks/[taskId]/page.tsx)** - Auto-sync on page load
- **[src/lib/ai-task-worker.ts](src/lib/ai-task-worker.ts)** - Auto-sync before AI processing
- **[src/app/api/sync-task-template/route.ts](src/app/api/sync-task-template/route.ts)** - Manual sync API
- **[scripts/test-task-sync.ts](scripts/test-task-sync.ts)** - Testing script

## Benefits

✅ No more deleting and recreating tasks when templates change
✅ Always uses the latest AI instructions and criteria
✅ Automatic and transparent - works in the background
✅ Smart cooldown prevents unnecessary syncs
✅ Tracks sync history with metadata
✅ Can be manually triggered when needed

## Future Enhancements

Possible future improvements:

- [ ] Bulk sync all tasks for a given template
- [ ] UI indicator showing when a task was last synced
- [ ] Manual sync button in the task UI
- [ ] Sync history/audit log
- [ ] Selective field syncing from UI
- [ ] Template versioning to track changes over time
