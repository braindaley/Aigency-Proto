# Chat Artifact Cleanup - Documentation

## Problem

Task chat interfaces were cluttered with large JSON/markdown artifacts embedded directly in the chat messages, making conversations difficult to read and navigate.

**Example**: Opening a task like http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/Ubao1CBbWatHi0emkgVe would show hundreds of lines of JSON code in the chat.

## Solution

### 1. Prevention (Future Tasks)

**Modified**: [src/app/api/ai-task-completion/route.ts](src/app/api/ai-task-completion/route.ts)

#### Changes:
- **Extract artifacts** before saving to chat (lines 225-240)
- **Clean chat messages** by removing `<artifact>...</artifact>` tags and content
- **Display summary** instead: "I've generated the [Task Name] document..."
- **Auto-save artifacts** to the artifacts collection (lines 258-302)

**Result**: New AI task completions will show clean, conversational messages in the chat while preserving full artifact content in the artifacts collection.

### 2. Cleanup (Existing Messages)

**Created**:
- [scripts/clean-chat-artifacts.js](scripts/clean-chat-artifacts.js) - Clean specific tasks
- [scripts/clean-all-chat-artifacts.js](scripts/clean-all-chat-artifacts.js) - Clean all tasks

#### Cleanup Results:
```
Total messages scanned: 293
Messages cleaned: 75
```

**What was cleaned**:
- Removed `<artifact>...</artifact>` tags and content from chat messages
- Removed markdown code blocks (```json```)
- Replaced artifact-only messages with friendly summaries
- Preserved any explanatory text that was outside the artifact tags

### 3. Before & After

#### Before:
```
<artifact>
{
  "applicant_information": {
    "business_name": "TWR Enterprises, Inc.",
    "dba": "TWR Enterprises, Inc.",
    "locations": [
      {
        "type": "Headquarters/Warehouse",
        "address": "1661 Railroad Street, Corona, CA 92878",
        ...
      }
    ],
    ...
  }
  // ... 500+ lines of JSON
}
</artifact>
```

#### After:
```
I've generated the Complete ACORD 125 – Commercial Insurance Application document.
You can view it in the artifact viewer or download it from the artifacts section.
```

## Benefits

✅ **Clean Chat Interface** - Chat is for conversation, not document storage
✅ **Better UX** - Users can actually read the chat without scrolling through hundreds of lines
✅ **Artifacts Preserved** - Full content still available in artifacts collection and viewer
✅ **Faster Loading** - Smaller message payloads = faster chat loading
✅ **Professional Appearance** - Chat looks like a conversation, not a code dump

## Architecture

### Chat Messages
- **Purpose**: Conversational updates, status messages, explanations
- **Content**: Plain text or markdown-formatted explanations
- **Display**: TaskChat component, real-time updates

### Artifacts
- **Purpose**: Generated documents, forms, reports
- **Content**: Full markdown/JSON content with all details
- **Storage**: `companies/{companyId}/artifacts` collection
- **Display**:
  - Artifact viewer panel
  - DependencyArtifactsReview component
  - Download functionality

### Workflow
1. AI generates response with `<artifact>` tags
2. Extract artifact content → save to artifacts collection
3. Remove artifact from chat message → save clean summary
4. User sees friendly message in chat
5. User views/downloads full artifact from artifact viewer

## Usage

### Run Cleanup on Specific Tasks
```bash
# Edit the taskIds array in the script first
node scripts/clean-chat-artifacts.js
```

### Run Cleanup on All Tasks
```bash
node scripts/clean-all-chat-artifacts.js
```

### Verify Cleanup
1. Open any task page (e.g., http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/Ubao1CBbWatHi0emkgVe)
2. Check the chat interface - should show clean messages
3. Check the artifact viewer - should still show full documents

## Related Files

- [src/app/api/ai-task-completion/route.ts](src/app/api/ai-task-completion/route.ts#L225-L302) - Artifact extraction and saving
- [src/components/TaskAIArtifacts.tsx](src/components/TaskAIArtifacts.tsx) - Artifact viewer component
- [src/components/DependencyArtifactsReview.tsx](src/components/DependencyArtifactsReview.tsx) - Dependency artifact review
- [src/lib/artifact-utils.ts](src/lib/artifact-utils.ts) - Artifact management utilities

## Notes

- **Old messages**: The cleanup script handles existing messages
- **New messages**: The API route prevents artifacts in chat going forward
- **Re-run safe**: Scripts check for existing artifacts and update (no duplicates)
- **Non-destructive**: Original artifacts preserved in artifacts collection
- **Reversible**: If needed, artifacts can be retrieved from the artifacts collection

## Future Improvements

Consider:
1. Real-time artifact rendering in a dedicated panel/modal
2. Artifact version history
3. Artifact search and filtering
4. Artifact export to multiple formats (PDF, DOCX, etc.)
5. Artifact comparison tools
