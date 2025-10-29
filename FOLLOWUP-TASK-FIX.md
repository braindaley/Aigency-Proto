# Follow-up Task Fix Summary

## Issue
The "Draft follow-up emails" task was failing validation because the test criteria were checking for outcomes that should only exist **after** emails are sent, not while drafting them.

## Problems with Original Test Criteria
The old criteria expected:
1. ❌ **Confirmation of receipt obtained** - Can't have this in a draft
2. ❌ **Timestamps and responses logged** - No responses exist yet for drafts
3. ❌ **Follow-up schedule established** - Wrong task phase
4. ❌ **Contact information verified and updated** - Separate task concern
5. ❌ **Tracking system updated with submission status** - Wrong task entirely
6. ❌ **Follow-ups sent within 48 hours** - Can't validate timing on drafts

These criteria were appropriate for a task called "Send follow-up emails" or "Track follow-up responses," but NOT for "Draft follow-up emails."

## Solution
Updated the test criteria to validate what a **draft** should contain:

### New Test Criteria (Template ID: XajTm0iTsvZX4RIXGmD6)

1. ✅ Follow-up email drafted for each carrier that received an original submission in the prior task
2. ✅ Each email includes professional greeting addressing the carrier/underwriter
3. ✅ Email references the original submission date and documents sent (ACORD 125, ACORD 130, loss runs, narrative)
4. ✅ Email politely requests confirmation of receipt and expected timeline for quote response
5. ✅ Email offers to provide additional information if needed
6. ✅ Email includes proper closing with agent name, agency name, and contact information
7. ✅ Professional insurance broker tone maintained throughout
8. ✅ Email is brief and focused (3-4 paragraphs)
9. ✅ Each email is personalized for the specific carrier
10. ✅ Number of follow-up emails matches the number of carriers contacted in prior task
11. ✅ No internal task metadata, system references, or workflow details included in email body
12. ✅ Subject line clearly identifies this as a follow-up for the specific company

## Changes Made

### 1. Fixed Task Status
- **File**: Firestore `companyTasks` collection
- **Task ID**: `GwnjdfTi1JOPGBcpPWot`
- **Change**: Status from `"available"` → `"Needs attention"`
- **Reason**: Invalid status prevented task from appearing on renewal page

### 2. Updated Test Criteria
- **File**: Firestore `tasks` collection (template)
- **Template ID**: `XajTm0iTsvZX4RIXGmD6`
- **Change**: Added 12 new test criteria focused on draft email content
- **Reason**: Original criteria checked for post-send outcomes, not draft quality

## Task Flow Context

This task is part of the Workers' Compensation renewal workflow:

1. **Task 11**: Draft custom marketing emails → Creates initial outreach emails
2. **Task 12**: Send submission packets → Actually sends the emails
3. **Task 13**: Draft follow-up emails → **THIS TASK** - Creates follow-up drafts
4. **Task 14**: Send follow-up emails → Actually sends the follow-ups
5. **Task 15+**: Track responses, log submissions, etc.

## Key Insight

The test criteria need to match the task's action verb:
- **"Draft"** tasks → Validate content quality, format, completeness
- **"Send"** tasks → Validate delivery, timestamps, confirmations
- **"Track"** tasks → Validate logging, status updates, follow-up schedules

## Scripts Created

1. **check-followup-task.js** - Diagnostic script to find the issue
2. **check-task-dependencies.js** - Verify dependency chain
3. **fix-followup-task-status.js** - Fix the "available" status issue
4. **get-task-test-criteria.js** - View current test criteria
5. **update-followup-test-criteria.js** - Apply the new criteria

## Result

The task should now:
- ✅ Appear in "Needs attention" section on renewal page
- ✅ Pass validation when drafts are properly formatted
- ✅ Have appropriate, achievable test criteria
- ✅ Align with its position in the workflow

## Testing

To verify the fix:
1. Navigate to: http://localhost:9003/companies/OHioSIzK4i7HwcjLbX5r/renewals/workers-comp
2. Look for "Draft follow-up emails" in "Needs attention" section
3. Complete the task by generating email drafts
4. Validation should pass if emails contain all required elements from new criteria
