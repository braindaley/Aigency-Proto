# Markdown Standardization Fix - 2025-10-28

## Problem
Artifacts were being generated in inconsistent formats (XML, HTML, JSON) instead of standardized Markdown format. This caused rendering issues where formatted documents would display correctly during testing but appear unformatted after task completion.

Example issue: Task `GQCaZODIVXwzencirSug` ("Research public info (OSHA data, company site)") was generating XML-formatted artifacts instead of Markdown.

## Root Cause
The AI system prompts in multiple locations did not explicitly enforce Markdown formatting for artifact content. While they instructed the AI to wrap content in `<artifact>` tags, they didn't specify what format the content inside those tags should be, leading to inconsistent output formats.

## Solution
Implemented a comprehensive fix to enforce Markdown formatting across all artifact generation paths:

### 1. Updated AI Task Worker ([src/lib/ai-task-worker.ts](src/lib/ai-task-worker.ts))
- Added explicit Markdown format instructions in the `buildSystemPrompt` method (lines 532-548)
- Includes clear examples of correct vs incorrect formats
- Explicitly prohibits XML, HTML, and JSON inside artifact tags

### 2. Updated Chat/Artifact API ([src/app/api/chat/artifact/route.ts](src/app/api/chat/artifact/route.ts))
- Enhanced both `generateArtifact` and `updateArtifact` system prompts
- Added comprehensive Markdown formatting guidelines (lines 272-288, 333-336)
- Provides clear format examples and prohibited formats

### 3. Updated All Task Templates
- Created script: [scripts/update-task-prompts-markdown.js](scripts/update-task-prompts-markdown.js)
- Updated 41 artifact-based task templates in Firestore
- Added markdown format instructions to all task system prompts
- Skipped 111 non-artifact tasks (chat/email interface types)

## Changes Made

### Files Modified
1. **src/lib/ai-task-worker.ts** - Added markdown format enforcement
2. **src/app/api/chat/artifact/route.ts** - Enhanced format instructions
3. **scripts/update-task-prompts-markdown.js** - New script for batch updates

### Format Instructions Added
All artifact generation now includes:
```
ARTIFACT CONTENT FORMAT - ALWAYS USE MARKDOWN:
The content INSIDE the <artifact> tags MUST be formatted as clean, well-structured Markdown.
✅ CORRECT:   <artifact># Title\n\n## Section\n\nContent here...</artifact>
❌ INCORRECT: <artifact><?xml version="1.0"?><document>...</document></artifact>
❌ INCORRECT: <artifact><html><body>...</body></html></artifact>
❌ INCORRECT: <artifact>{"title": "...", "content": "..."}</artifact>

Use proper Markdown formatting:
- # for main title, ## for sections, ### for subsections
- **bold** for emphasis
- Bullet points with - or *
- Numbered lists with 1., 2., 3.
- > for blockquotes
- Inline code with backticks, code blocks with triple backticks
- [text](url) for links

DO NOT use XML, HTML, or JSON inside the artifact tags. Only use Markdown.
```

## Impact

### Before
- Artifacts could be generated in any format (XML, HTML, JSON, Markdown)
- Inconsistent rendering across the application
- Documents appeared unformatted after task completion
- Preview and Source tabs showed different formatting issues

### After
- All new artifacts will be generated in consistent Markdown format
- Proper rendering in Preview mode with ReactMarkdown
- Clean source view in Source mode
- Consistent formatting across all task types

## Testing Recommendations

1. **Re-run the problematic task**: Regenerate the artifact for task `GQCaZODIVXwzencirSug` to verify markdown format
2. **Test artifact generation**: Create new AI tasks and verify artifacts are in markdown
3. **Test artifact updates**: Edit existing artifacts via chat and verify markdown is maintained
4. **Verify all interface types**: Test artifact-based tasks across different phases (Submission, Marketing, etc.)

## Migration Notes

### Existing Artifacts
Existing artifacts with XML/HTML/JSON format will continue to work but won't automatically convert. Options:
1. Let them be - they'll still display in Source mode
2. Regenerate specific artifacts by re-running AI tasks
3. Create a migration script if bulk conversion is needed

### New Artifacts
All newly generated artifacts will use Markdown format automatically.

## Related Files
- [src/lib/ai-task-worker.ts](src/lib/ai-task-worker.ts) - Main AI task processing
- [src/app/api/chat/artifact/route.ts](src/app/api/chat/artifact/route.ts) - Chat-based artifact generation
- [src/components/TaskAIArtifacts.tsx](src/components/TaskAIArtifacts.tsx) - Artifact rendering component
- [src/lib/artifact-utils.ts](src/lib/artifact-utils.ts) - Artifact storage utilities
- [scripts/update-task-prompts-markdown.js](scripts/update-task-prompts-markdown.js) - Template update script

## Future Improvements
1. Add format validation before saving artifacts
2. Create auto-conversion for legacy XML/HTML artifacts
3. Add markdown preview in artifact editor
4. Implement markdown linting for generated content
