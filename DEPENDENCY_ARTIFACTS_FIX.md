# Dependency Artifacts Not Showing - Fix Documentation

## Problem

The "Finalize and approve submission package" task (http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/KYHqncvTWOpG6Iys5maS) was only showing 1 out of 4 dependency artifacts in the review section.

## Root Cause

The `DependencyArtifactsReview` component was **only looking for artifacts in chat messages** with `<artifact>` tags:

```typescript
// OLD CODE - Only checked chat messages
const fullContent = messages.map(m => m.content).join('\n');
const artifactMatch = fullContent.match(/<artifact>([\s\S]*?)<\/artifact>/);
```

**Problem**: After running the chat cleanup script, most artifacts were removed from chat messages and moved to the artifacts collection. The component couldn't find them anymore.

## Investigation Results

Task: "Finalize and approve submission package"
- **Expected**: 4 artifacts (from 4 dependencies)
- **Found in chat**: 1 artifact (only ACORD 130 still had `<artifact>` tags)
- **Found in collection**: 4 artifacts ✅

### Dependency Analysis:

| Dependency Task | Chat Artifact | Collection Artifact | Size |
|----------------|---------------|---------------------|------|
| Generate coverage suggestions | ❌ No | ✅ Yes | 8,063 chars |
| ACORD 130 | ✅ Yes | ✅ Yes | 10,069 chars |
| ACORD 125 | ❌ No | ✅ Yes | 7,146 chars |
| Write narrative | ❌ No | ✅ Yes | 2,885 chars |

## Solution

Updated [src/components/DependencyArtifactsReview.tsx](src/components/DependencyArtifactsReview.tsx#L69-L111) to:

1. **Primary**: Check artifacts collection first
2. **Fallback**: Check chat messages (for legacy artifacts)

### New Logic:

```typescript
// NEW CODE - Check artifacts collection first
// 1. Try artifacts collection
const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
const artifactsSnapshot = await getDocs(artifactsRef);

const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
  const data = doc.data();
  return data.taskId === matchingTask.id;
});

if (taskArtifacts.length > 0) {
  // Use artifact from collection
  artifactContent = taskArtifacts[0].data.data;
} else {
  // Fallback to chat messages (for legacy)
  const artifactMatch = fullContent.match(/<artifact>([\s\S]*?)<\/artifact>/);
  if (artifactMatch) {
    artifactContent = artifactMatch[1].trim();
  }
}
```

## Benefits

✅ **All artifacts now visible** - Checks both artifacts collection and chat messages
✅ **Future-proof** - Prioritizes artifacts collection (where all new artifacts are saved)
✅ **Backward compatible** - Still supports legacy artifacts in chat messages
✅ **No data loss** - All existing artifacts remain accessible

## Testing

Navigate to: http://localhost:9002/companies/qsu1QXPB8TUK2P4QyDiy/tasks/KYHqncvTWOpG6Iys5maS

**Expected**: Should now see 4 artifacts in the "Review Required Documents" section:
1. Generate coverage suggestions
2. Complete ACORD 130 - Workers' Compensation Application
3. Complete ACORD 125 – Commercial Insurance Application
4. Write narrative

## Related Changes

This fix complements the earlier chat cleanup work:
- [CHAT_ARTIFACT_CLEANUP.md](CHAT_ARTIFACT_CLEANUP.md) - Why artifacts were removed from chat
- [src/app/api/ai-task-completion/route.ts](src/app/api/ai-task-completion/route.ts) - Automatic artifact saving to collection

## Architecture

### Old Flow (Broken):
```
AI generates artifact
→ Saved to chat with <artifact> tags
→ DependencyArtifactsReview reads from chat
→ ✅ Works

Cleanup script runs
→ Removes <artifact> tags from chat
→ DependencyArtifactsReview reads from chat
→ ❌ No artifacts found
```

### New Flow (Fixed):
```
AI generates artifact
→ Saved to artifacts collection (new behavior)
→ Chat gets clean summary message
→ DependencyArtifactsReview reads from collection
→ ✅ Works

OR (legacy):
→ Old artifact still in chat
→ DependencyArtifactsReview reads from chat as fallback
→ ✅ Works
```

## Future Improvements

Consider:
1. Caching artifacts to reduce Firestore reads
2. Lazy loading artifacts (only load when expanded)
3. Artifact versioning/history
4. Bulk artifact operations
