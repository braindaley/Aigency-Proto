# Marketing Files Management System

## Overview

A comprehensive system for uploading, managing, and accessing insurance marketing materials organized by insurance type. The AI assistant can access these files when working on tasks for specific insurance types.

## Features

### 1. Insurance Type Organization

Files are categorized by insurance type:
- **Workers' Compensation** (`workers-comp`)
- **Auto Insurance** (`auto`)
- **General Liability** (`general-liability`)
- **Property Insurance** (`property`)
- **Umbrella Insurance** (`umbrella`)
- **Other** (`other`)

### 2. User Interface

**Location**: [Settings → Marketing Files](http://localhost:9002/settings/marketing-files)

#### Features:
- ✅ **Tabbed Interface** - Browse files by insurance type
- ✅ **File Counter** - See how many files per insurance type
- ✅ **Upload Form** - Easy file upload with insurance type selection
- ✅ **Description Field** - Add context to uploaded files
- ✅ **View/Download** - Preview files or download them
- ✅ **Delete** - Remove files with confirmation
- ✅ **Responsive** - Works on desktop and mobile

#### Supported File Types:
- PDF (`.pdf`)
- Word Documents (`.doc`, `.docx`)
- Excel Spreadsheets (`.xls`, `.xlsx`)
- PowerPoint Presentations (`.ppt`, `.pptx`)
- Text Files (`.txt`, `.md`)

### 3. Database Schema

**Collection**: `marketingFiles`

```typescript
interface MarketingFile {
  id: string;                  // Auto-generated document ID
  name: string;                // Original filename
  insuranceType: string;       // Insurance type category
  description?: string;        // Optional description
  url: string;                 // Firebase Storage download URL
  storagePath: string;         // Path in Firebase Storage
  size: number;                // File size in bytes
  uploadedAt: Timestamp;       // Upload timestamp
  uploadedBy?: string;         // User who uploaded (future)
}
```

**Storage Path**: `marketing-files/{insuranceType}/{timestamp}_{filename}`

### 4. AI Integration

Marketing files are automatically included in the AI assistant's context when working on tasks.

#### How It Works:

1. **Task Detection** - System identifies the task's insurance type (`renewalType` or `policyType`)
2. **File Retrieval** - Fetches relevant marketing files for that insurance type
3. **Context Injection** - Adds files to the AI context with descriptions

#### Context Format:

```
=== MARKETING MATERIALS (WORKERS-COMP) ===
You have access to 3 marketing file(s) for workers-comp:
- Carrier Guidelines.pdf: Underwriting requirements for WC
- Rate Sheet 2024.xlsx: Current WC rates
- Submission Checklist.pdf

These files contain carrier-specific information, guidelines,
underwriting requirements, and marketing materials for workers-comp
insurance. Reference these when needed for carrier-specific questions
or submission requirements.
```

#### AI Access Points:

The AI can access marketing files when:
- ✅ Completing tasks via AI Task Completion
- ✅ Chatting in task chat
- ✅ Using enhanced context for any insurance-type-specific task

### 5. Implementation

#### Files Modified/Created:

1. **[src/app/settings/page.tsx](src/app/settings/page.tsx#L48-L63)**
   - Added Marketing Files card to settings

2. **[src/app/settings/marketing-files/page.tsx](src/app/settings/marketing-files/page.tsx)** (NEW)
   - Complete marketing files management interface
   - Upload, view, delete functionality
   - Tabbed interface by insurance type

3. **[src/lib/data-service.ts](src/lib/data-service.ts#L659-L679)**
   - Added `getMarketingFiles()` method
   - Integrated into `getEnhancedAITaskContext()`
   - Marketing files included in AI context

## Usage Guide

### For Users

#### Upload Marketing Files

1. Navigate to **Settings → Marketing Files**
2. Select **Insurance Type** from dropdown
3. Click **Choose File** and select your document
4. (Optional) Add a **Description** for context
5. Click **Upload File**
6. File appears in the corresponding insurance type tab

#### View/Download Files

1. Click the **insurance type tab** to view files
2. Click the **eye icon** to preview in browser
3. Click the **download icon** to save locally

#### Delete Files

1. Find the file in its insurance type tab
2. Click the **trash icon**
3. Confirm deletion

### For AI Assistant

The AI automatically accesses relevant marketing files:

```
User: "What are the underwriting requirements for this workers comp renewal?"

AI Context Includes:
- Marketing files tagged as "workers-comp"
- Carrier guidelines
- Rate sheets
- Submission checklists

AI Response: Based on the carrier guidelines (Carrier Guidelines.pdf),
the underwriting requirements for workers comp include...
```

## Database Queries

### Get Files by Insurance Type

```javascript
const marketingFiles = await DataService.getMarketingFiles('workers-comp');
```

### Get All Marketing Files

```javascript
const allFiles = await DataService.getMarketingFiles();
```

### Used in AI Context

```javascript
const context = await DataService.getEnhancedAITaskContext(companyId, taskId);
console.log(context.marketingFiles); // Array of relevant marketing files
```

## Security & Access Control

### Current Implementation:
- ✅ Files stored in Firebase Storage
- ✅ Firestore rules protect database
- ✅ Files accessible via authenticated URLs

### Future Enhancements:
- [ ] User-level permissions
- [ ] Role-based access (admin, agent, viewer)
- [ ] Audit log of file access
- [ ] File expiration dates

## Benefits

### For Insurance Agents:
1. **Centralized Repository** - All marketing materials in one place
2. **Easy Access** - Quick reference during submissions
3. **AI-Powered** - Assistant knows carrier-specific requirements
4. **Organized** - Categorized by insurance type

### For AI Assistant:
1. **Context-Aware** - Knows which files are relevant
2. **Accurate** - References actual carrier guidelines
3. **Up-to-Date** - Always uses latest uploaded materials
4. **Specific** - Tailored to the insurance type being worked on

## Example Workflows

### Workflow 1: Workers Comp Submission

```
1. Agent uploads "ABC Carrier WC Guidelines.pdf" to workers-comp
2. Agent starts "Complete ACORD 130" task
3. AI detects task is for workers-comp
4. AI loads ABC Carrier guidelines automatically
5. AI includes carrier-specific requirements in ACORD 130
6. Agent reviews and submits
```

### Workflow 2: Multi-Line Renewal

```
1. Agent uploads files for all insurance types:
   - WC guidelines → workers-comp
   - Auto requirements → auto
   - GL checklist → general-liability
2. Agent works through renewal tasks
3. Each task gets relevant marketing files
4. AI provides accurate, carrier-specific guidance
5. Complete submission package with all requirements met
```

## Maintenance

### File Management:
- **Review Quarterly** - Remove outdated materials
- **Update Annually** - Upload new rate sheets and guidelines
- **Organize** - Use consistent naming conventions
- **Describe** - Add helpful descriptions for AI context

### Monitoring:
- Check file sizes to avoid storage limits
- Verify files are accessible
- Remove duplicates
- Archive old versions

## Future Enhancements

### Planned Features:
1. **Version Control** - Track file versions and changes
2. **Expiration Dates** - Auto-archive outdated files
3. **Bulk Upload** - Upload multiple files at once
4. **Search** - Find files by name or description
5. **Tags** - Add custom tags for better organization
6. **Carrier-Specific** - Tag files by specific carrier
7. **File Preview** - PDF preview in-app
8. **Usage Analytics** - Track which files AI references most

### Integration Opportunities:
1. **Document Processing** - Extract text from PDFs for better AI access
2. **Vector Search** - Semantic search across marketing materials
3. **Smart Suggestions** - AI recommends relevant files for tasks
4. **Automatic Tagging** - AI categorizes uploaded files
5. **Content Summarization** - AI generates summaries of guidelines

## Technical Notes

### Storage Structure:
```
firebase-storage/
└── marketing-files/
    ├── workers-comp/
    │   ├── 1234567890_carrier-guidelines.pdf
    │   └── 1234567891_rate-sheet.xlsx
    ├── auto/
    │   └── 1234567892_submission-checklist.pdf
    └── general-liability/
        └── 1234567893_coverage-requirements.pdf
```

### Firestore Structure:
```
firestore/
└── marketingFiles/
    ├── {docId1}
    │   ├── name: "carrier-guidelines.pdf"
    │   ├── insuranceType: "workers-comp"
    │   ├── url: "https://..."
    │   └── ...
    └── {docId2}
        └── ...
```

### Performance:
- Files loaded on-demand per insurance type
- Cached in browser for repeated access
- Lazy loading for large file lists
- Optimized queries with Firestore indexes

## Support

### Common Issues:

**Q: Files not showing up in AI context?**
A: Ensure task has `renewalType` or `policyType` field set correctly

**Q: Upload fails?**
A: Check file size (<10MB recommended) and format is supported

**Q: Can't delete file?**
A: Verify Firebase permissions and file isn't in use

**Q: How many files can I upload?**
A: No hard limit, but keep organized and remove outdated files

### Getting Help:

- Check browser console for errors
- Verify Firebase connection
- Review Firestore security rules
- Check storage quota limits
