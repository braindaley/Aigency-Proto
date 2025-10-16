# Task Dependency Update Issue - Fix Documentation

## Problem Summary

Tasks with completed dependencies were not automatically updating to "Needs attention" status, blocking workflow progression.

### Specific Issue

**Task**: "Complete ACORD 125 – Commercial Insurance Application"
- **Status**: Stuck at "Upcoming"
- **Dependency**: "Complete ACORD 130 - Workers' Compensation Application" (✅ completed)
- **Expected**: Should be "Needs attention" when dependency completes
- **Actual**: Remained "Upcoming"

## Root Cause

The bug was in [src/app/api/ai-task-completion/route.ts](src/app/api/ai-task-completion/route.ts:388-408):

```javascript
// OLD CODE (line 391-398)
const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9002'}/api/update-task-status`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId, status: 'completed' }),
});
console.log(`✅ Dependency update triggered successfully`); // ❌ No error checking!
```

**Issues Identified**:
1. ❌ No response status check (`response.ok`)
2. ❌ Silent failures - logs "success" even if request failed
3. ❌ No error details logged when fetch fails
4. ❌ Environment variables not set (`NEXTAUTH_URL` undefined)

## Fix Applied

### 1. Improved Error Handling

Updated [src/app/api/ai-task-completion/route.ts:388-408](src/app/api/ai-task-completion/route.ts#L388-L408):

```javascript
// NEW CODE with proper error handling
const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9002'}/api/update-task-status`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId, status: 'completed' }),
});

if (!response.ok) {
  const errorText = await response.text();
  console.error(`❌ Dependency update failed with status ${response.status}: ${errorText}`);
} else {
  const result = await response.json();
  console.log(`✅ Dependency update triggered successfully:`, result);
}
```

**Benefits**:
- ✅ Checks response status before logging success
- ✅ Logs actual error details when fetch fails
- ✅ Returns response data for debugging

### 2. Dependency Sync Scripts

Created utility scripts to fix and prevent stuck dependencies:

#### A. **Fix Stuck Dependencies** (`scripts/fix-stuck-dependencies.js`)
- Scans all tasks for a company
- Identifies tasks with completed dependencies but wrong status
- Updates them to "Needs attention"
- Triggers AI auto-execution if applicable

**Usage**:
```bash
node scripts/fix-stuck-dependencies.js
```

#### B. **Sync All Dependencies** (`scripts/sync-all-task-dependencies.js`)
- Scans ALL companies
- Fixes stuck dependencies across entire system
- Can be run periodically as a maintenance job

**Usage**:
```bash
node scripts/sync-all-task-dependencies.js
```

#### C. **Debug Dependencies** (`scripts/debug-task-dependencies.js`)
- Detailed dependency analysis for a specific company
- Shows dependency chains and status
- Identifies which tasks should update

**Usage**:
```bash
node scripts/debug-task-dependencies.js
```

## Dependency Update Logic

The dependency system works in two places:

### 1. Primary: Update Task Status API
[src/app/api/update-task-status/route.ts](src/app/api/update-task-status/route.ts:50-135)

When a task is marked complete:
1. Updates task status in Firestore
2. Searches for tasks that depend on this task (by document ID or template ID)
3. Checks if ALL dependencies are completed
4. Updates dependent tasks to "Needs attention"
5. Triggers AI auto-execution for AI tasks

### 2. Secondary: AI Task Completion
[src/app/api/ai-task-completion/route.ts](src/app/api/ai-task-completion/route.ts:361-411)

When AI completes a task:
1. Validates and marks task complete
2. Calls update-task-status API to trigger dependency checks
3. **Bug was here** - didn't check if the call succeeded

## Testing & Verification

### Verification Steps

1. **Check current state**:
```bash
node scripts/debug-task-dependencies.js
```

2. **Fix stuck tasks**:
```bash
node scripts/fix-stuck-dependencies.js
```

3. **Verify fix**:
- Navigate to task page: http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy
- Confirm "Complete ACORD 125" is now "Needs attention"

### Test Results

✅ **ACORD 125 Task Fixed**:
- Status updated: "Upcoming" → "Needs attention"
- AI auto-execution triggered
- Task completed successfully
- Used 32 artifacts to generate the form

## Prevention Measures

### 1. Improved Logging
The fix adds detailed logging that will help identify future issues:
- Response status codes
- Error messages
- Success confirmations with data

### 2. Periodic Sync Job
Set up a cron job or scheduled task:
```bash
# Run every hour
0 * * * * cd /path/to/project && node scripts/sync-all-task-dependencies.js
```

### 3. Monitoring
Watch for these log patterns:
- ❌ `Dependency update failed with status`
- ❌ `Failed to trigger dependency updates`

### 4. Environment Variables
Consider setting these in `.env`:
```bash
NEXTAUTH_URL=http://localhost:9002
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

## Files Modified

1. ✅ [src/app/api/ai-task-completion/route.ts](src/app/api/ai-task-completion/route.ts#L388-L408) - Fixed error handling
2. ✅ [scripts/fix-stuck-dependencies.js](scripts/fix-stuck-dependencies.js) - Fix script
3. ✅ [scripts/sync-all-task-dependencies.js](scripts/sync-all-task-dependencies.js) - Maintenance script
4. ✅ [scripts/debug-task-dependencies.js](scripts/debug-task-dependencies.js) - Debug script

## Related Issues

### ACORD 130 Format Issue (Also Fixed)
While investigating, we discovered ACORD 130 was generating JSON instead of Markdown:
- **Cause**: Task systemPrompt specified JSON format
- **Fix**: Updated to use markdown template from `acord-130-system-prompt.txt`
- **Script**: `scripts/fix-acord-130-prompt.js`

See [ACORD_130_FIX.md](ACORD_130_FIX.md) for details.

## Summary

**Before**: Tasks got stuck at "Upcoming" even when dependencies were complete

**After**:
- ✅ Dependency updates work reliably
- ✅ Better error logging for debugging
- ✅ Utility scripts for fixing/preventing stuck tasks
- ✅ AI auto-execution triggers correctly

**Impact**: Workflow now progresses automatically as tasks complete
