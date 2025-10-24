# Template Merge Architecture

## Problem
Currently, company tasks are **static copies** of templates. When you update a template (like changing a task from `manual` to `ai`), existing company tasks don't get the updates. You have to manually update each company task instance.

## Solution: Dynamic Template Merging

Instead of copying all template data into company tasks, we:
1. Store only **company-specific data** in `companyTasks` collection
2. **Merge with template data** at runtime when loading tasks
3. Template updates automatically apply to all company tasks

## Architecture Changes

### Current Structure (Static Copy)

**companyTasks collection:**
```javascript
{
  id: "5KIpGSgt481jk1t2pRgP",
  templateId: "sKY8AVp6hj3pqZ957KTT",
  companyId: "hkDZmFfhLVy7cAqxdfsz",

  // All these copied from template (redundant):
  taskName: "Identify suitable carriers for WC",
  description: "...",
  systemPrompt: "...",
  tag: "manual",  // ⚠️ This doesn't update if template changes to "ai"
  phase: "Marketing",
  dependencies: [...],
  testCriteria: "...",

  // Company-specific data:
  status: "Upcoming",
  renewalDate: Timestamp,
  renewalType: "workers-comp",
  completedAt: null,
  updatedAt: "2024-01-20"
}
```

### New Structure (Dynamic Merge)

**companyTasks collection (minimal):**
```javascript
{
  id: "5KIpGSgt481jk1t2pRgP",
  templateId: "sKY8AVp6hj3pqZ957KTT",  // Reference to template
  companyId: "hkDZmFfhLVy7cAqxdfsz",

  // Only company-specific data:
  status: "Upcoming",
  renewalDate: Timestamp,
  renewalType: "workers-comp",
  completedAt: null,
  updatedAt: "2024-01-20",

  // Optional overrides (if needed):
  // taskNameOverride: "Custom name for this company",
  // descriptionOverride: "Custom description",
}
```

**tasks collection (templates):**
```javascript
{
  id: "sKY8AVp6hj3pqZ957KTT",
  taskName: "Search suitable carriers using marketing database",
  description: "...",
  systemPrompt: "...",
  tag: "ai",  // ✅ Update here = all company tasks get it
  phase: "Marketing",
  dependencies: [...],
  testCriteria: "...",
  showDependencyArtifacts: true,
  policyType: "workers-comp",
  sortOrder: 10
}
```

## Implementation

### 1. Update `getCompanyTasks()` in DataService

```typescript
static async getCompanyTasks(companyId?: string): Promise<CompanyTask[]> {
  try {
    // 1. Load all templates (cache these in memory)
    const templates = await this.getTaskTemplatesMap();

    // 2. Load company task instances
    const tasksRef = collection(db, 'companyTasks');
    let q = companyId
      ? query(tasksRef, where('companyId', '==', companyId))
      : query(tasksRef);

    const snapshot = await getDocs(q);

    // 3. Merge template data with company data
    const tasks = snapshot.docs.map(doc => {
      const companyData = doc.data();
      const template = templates[companyData.templateId];

      if (!template) {
        console.warn(`Template ${companyData.templateId} not found for task ${doc.id}`);
        return { id: doc.id, ...companyData } as CompanyTask;
      }

      // Merge: template data + company-specific overrides
      return {
        id: doc.id,
        // Template data (can be overridden):
        ...template,
        // Company-specific data (takes precedence):
        ...companyData,
        // Use override fields if they exist:
        taskName: companyData.taskNameOverride || template.taskName,
        description: companyData.descriptionOverride || template.description,
      } as CompanyTask;
    });

    // Sort by renewalDate
    return tasks.sort((a, b) => {
      if (!a.renewalDate || !b.renewalDate) return 0;
      return a.renewalDate.toDate().getTime() - b.renewalDate.toDate().getTime();
    });
  } catch (error) {
    console.error('Error fetching company tasks:', error);
    return [];
  }
}

// Helper method to get templates as a map for fast lookup
static async getTaskTemplatesMap(): Promise<Record<string, Task>> {
  const templates = await this.getTaskTemplates();
  return templates.reduce((map, template) => {
    map[template.id] = template;
    return map;
  }, {} as Record<string, Task>);
}
```

### 2. Update Task Creation

When creating company tasks, only store minimal data:

```typescript
// Before (copying everything):
await setDoc(doc(db, 'companyTasks', taskId), {
  ...template,  // ❌ Copies all template data
  companyId,
  renewalDate,
  status: 'Upcoming'
});

// After (minimal data):
await setDoc(doc(db, 'companyTasks', taskId), {
  templateId: template.id,  // ✅ Just reference
  companyId,
  renewalDate,
  renewalType,
  status: 'Upcoming',
  createdAt: serverTimestamp()
});
```

## Benefits

### ✅ Advantages

1. **Automatic Updates**: Update template once → all tasks updated instantly
2. **Data Consistency**: Single source of truth for task definitions
3. **Storage Efficiency**: Much smaller `companyTasks` documents
4. **Easier Maintenance**: Change AI prompts, test criteria, dependencies in one place
5. **Version Control**: Easy to track template changes over time
6. **Flexibility**: Can still override specific fields per company if needed

### Example Use Cases

**Use Case 1: Update AI Prompt**
```
Change system prompt in template → All company tasks use new prompt immediately
No migration scripts needed!
```

**Use Case 2: Change Task Type**
```
Change tag from 'manual' to 'ai' in template → All tasks become AI-enabled
```

**Use Case 3: Add Test Criteria**
```
Add validation rules to template → All AI tasks use new validation
```

**Use Case 4: Update Dependencies**
```
Change task dependencies in template → All company workflows updated
```

### ⚠️ Considerations

1. **Performance**: Need to load templates on each request
   - **Solution**: Cache templates in memory with TTL (5-10 minutes)

2. **Custom Tasks**: Some companies might need task customization
   - **Solution**: Use override fields (`taskNameOverride`, etc.)

3. **Historical Data**: What if you need to see how task was when completed?
   - **Solution**: Store snapshot of template in `completedTaskSnapshot` field

4. **Migration**: Existing company tasks have redundant data
   - **Solution**: Run migration to remove redundant fields

## Migration Plan

### Phase 1: Update Code (No Breaking Changes)
1. ✅ Update `getCompanyTasks()` to merge template data
2. ✅ Update task creation to store minimal data
3. ✅ Add template caching layer
4. Test thoroughly with existing data (works with both old and new formats)

### Phase 2: Migrate Existing Tasks (Optional)
1. Script to remove redundant fields from existing company tasks
2. Keep only: `id`, `templateId`, `companyId`, `status`, `renewalDate`, `completedAt`, `updatedAt`
3. Backup before migration

### Phase 3: Add Advanced Features
1. Template versioning
2. Task override capabilities
3. Audit trail for template changes
4. Template snapshot on completion

## Testing Plan

1. **Unit Tests**: Test template merging logic
2. **Integration Tests**: Verify tasks load correctly
3. **Performance Tests**: Measure impact of template loading
4. **Migration Tests**: Ensure old and new formats work

## Next Steps

1. Implement `getTaskTemplatesMap()` helper
2. Update `getCompanyTasks()` with merge logic
3. Add in-memory cache for templates
4. Test with existing company tasks
5. Update task creation endpoints
6. Run migration script (optional)

## Code Location

Files to update:
- [src/lib/data-service.ts](src/lib/data-service.ts:30-58) - `getCompanyTasks()` method
- Task creation endpoints (wherever company tasks are created)
- Consider adding caching layer in DataService
