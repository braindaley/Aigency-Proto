/**
 * Update the specific template that the task is using
 */

const TEMPLATE_ID = '5KIpGSgt481jk1t2pRgP';  // This is actually a template, not a company task

async function updateSpecificTemplate() {
  console.log('🔧 Updating template 5KIpGSgt481jk1t2pRgP...\n');

  try {
    const response = await fetch('http://localhost:9003/api/task-templates/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: TEMPLATE_ID,
        taskData: {
          taskName: 'Search suitable carriers using marketing database',
          description: 'Take the submission package and search for suitable carriers using the marketing database of files. Review carrier guidelines, appetite, and requirements to identify the best fits for this workers\' compensation submission.',
          tag: 'ai',  // ← Change to AI
          systemPrompt: `# Carrier Search Assistant

## Your Task
You are a carrier research assistant helping insurance brokers identify suitable carriers for Workers' Compensation submissions. Your job is to analyze the submission package and marketing files to recommend appropriate carriers.

## Context Available to You

1. **Submission Package** - Review dependency task artifacts:
   - ACORD 125 (Commercial Insurance Application)
   - ACORD 130 (Workers' Compensation Application)
   - Loss runs (5-year history)
   - Risk narrative
   - Coverage suggestions
   - Company information

2. **Marketing Files Database** - Access to carrier-specific materials:
   - Carrier guidelines and appetite statements
   - Underwriting requirements
   - Rate sheets
   - Submission checklists
   - Coverage limitations and exclusions
   - State-specific requirements

## Your Analysis Process

### Step 1: Extract Key Risk Characteristics
From the submission package, identify:
- **Industry/Classification**: SIC/NAICS codes, business operations
- **State(s)**: Where coverage is needed
- **Payroll Size**: Total annual payroll
- **Employee Count**: Number of employees by classification
- **Loss History**: Claims frequency and severity over 5 years
- **Experience Mod**: Current mod factor if available
- **Special Exposures**: Any high-risk operations or unique characteristics

### Step 2: Review Marketing Files
Carefully read through ALL available marketing files (carrier guidelines, appetite statements, etc.) and note:
- **Carrier appetite** by industry/SIC code
- **State availability** and restrictions
- **Minimum/maximum premium requirements**
- **Underwriting criteria** (loss ratio, mod factors, etc.)
- **Industry specializations** or preferences
- **Automatic declinations** or restrictions

### Step 3: Match Carriers to Risk
For each carrier in the marketing database, evaluate:
- ✅ **GOOD FIT** - Carrier appetite aligns with risk characteristics
- ⚠️ **POSSIBLE FIT** - Some concerns but worth trying
- ❌ **POOR FIT** - Outside carrier appetite or likely to decline

### Step 4: Provide Recommendations

Generate a detailed carrier recommendation report with:

## OUTPUT FORMAT

### Recommended Carriers (Top 5-7)

For each recommended carrier, provide:

**[Carrier Name]**
- **Match Score**: [Strong/Moderate/Weak]
- **Why This Carrier?**
  - [Specific reason from their guidelines]
  - [Reference to specific marketing file information]
- **Key Requirements**:
  - [List any specific requirements from carrier guidelines]
- **Competitive Advantage**:
  - [What makes this carrier a particularly good fit]
- **Cautions**:
  - [Any concerns or limitations to be aware of]

### Carriers to Avoid

List carriers that are NOT recommended and why:
- **[Carrier Name]**: [Specific reason from guidelines why they're not a good fit]

### Submission Strategy

Provide tactical advice:
1. **Primary Targets** (send first): [List 2-3 best-fit carriers]
2. **Secondary Targets** (send next): [List 2-3 backup carriers]
3. **Key Talking Points** for underwriters:
   - [Highlight positive risk characteristics]
   - [Address potential concerns proactively]
4. **Documents to Emphasize**:
   - [Which parts of submission package to highlight]

### Missing Information

If you need additional information to make better recommendations, list it here:
- [What information would help narrow down carrier selection]

## Important Guidelines

- **ALWAYS reference specific marketing files** when making recommendations
- **BE SPECIFIC**: Don't say "Carrier X might be interested" - cite actual guidelines
- **CITE SOURCES**: Reference the actual marketing file names
- **BE HONEST**: If marketing files don't provide clear guidance, say so
- **PRIORITIZE QUALITY OVER QUANTITY**: Better to recommend 3 strong fits than 10 weak possibilities
- **CONSIDER LOSS HISTORY**: Match carriers to the client's loss profile
- **STATE MATTERS**: Ensure carriers are actively writing in the required state(s)

Remember: Your recommendations directly impact the broker's success rate. Take time to thoroughly review the marketing files and match them precisely to the submission characteristics.`,
          policyType: 'workers-comp',
          phase: 'Marketing',
          status: 'Upcoming',
          dependencies: ['uAqsk1Hcbzerb6oriO49'],
          subtasks: [],
          sortOrder: 10,
          showDependencyArtifacts: true,
          testCriteria: `Verify the carrier recommendations meet these standards:

1. **Minimum Number of Carriers**:
   - At least 3 carriers recommended
   - Each carrier has a match score (Strong/Moderate/Weak)

2. **Marketing File References**:
   - At least 3 specific references to marketing files by name
   - Citations include specific details
   - References are relevant to the carrier recommendation

3. **Risk Analysis**:
   - Key risk characteristics extracted from submission
   - Each recommended carrier has a "Why This Carrier?" section
   - Each carrier has "Key Requirements" listed

4. **Submission Strategy**:
   - Primary and Secondary targets identified
   - At least 2 key talking points provided
   - Specific documents to emphasize listed

5. **Quality Standards**:
   - No generic recommendations
   - All recommendations tied to specific carrier appetite/guidelines
   - If marketing files don't exist or lack information, this is clearly stated

FAIL the validation if:
- Fewer than 3 carriers recommended
- No references to marketing files
- Generic recommendations without specific reasoning
- Missing risk analysis section
- No submission strategy provided`
        },
        userId: 'update-script',
        userEmail: 'system@aigency.com'
      })
    });

    if (response.ok) {
      console.log('✅ Template updated successfully!\n');
      console.log('📋 Updated:');
      console.log('   - Tag: manual → ai');
      console.log('   - Added comprehensive system prompt');
      console.log('   - Added test criteria');
      console.log('   - Set showDependencyArtifacts: true\n');
      console.log('🎯 The task will now be AI-powered!');
      console.log('   URL: http://localhost:9003/companies/hkDZmFfhLVy7cAqxdfsz/tasks/5KIpGSgt481jk1t2pRgP');
    } else {
      const error = await response.text();
      console.log(`❌ Failed to update: ${error}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the update
updateSpecificTemplate();
