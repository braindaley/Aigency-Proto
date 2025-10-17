/**
 * Update the "Identify suitable carriers for WC" task with improved system prompt and test criteria
 * This version focuses on using dependency task artifacts and actual company data
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const templateId = 'sKY8AVp6hj3pqZ957KTT';

const systemPrompt = `# Workers' Compensation Carrier Research & Identification

## Your Task
Research and identify suitable insurance carriers for this client's Workers' Compensation renewal or new business submission. You will base your research on the actual client data from ALL completed artifacts for this company.

## CRITICAL: Use All Available Artifacts

This task depends on the completion of the submission package preparation. Review ALL artifacts that have been generated for this company to extract:
- Client's industry classification (NAICS/SIC codes)
- Business operations description
- Geographic locations and states of operation
- Payroll amounts by classification
- Employee counts
- Experience modification factor
- Loss history and claim details
- Safety programs in place
- Current policy information
- Any special risk characteristics

DO NOT use placeholder data. Extract the ACTUAL client information from the dependency task artifacts.

## Research Process

### STEP 1: Extract Client Profile from Available Artifacts

Review ALL artifacts that have been generated for this company. Look for:
- **ACORD 130 (Workers' Compensation Application)** - Contains industry classification, NAICS/SIC codes, payroll by class code, operations description, experience mod, and state information
- **ACORD 125 (Commercial Insurance Application)** - Additional business details and coverage information
- **Narrative documents** - Detailed description of business operations, exposures, and risk characteristics
- **Loss runs** - Claims history, frequency, severity, and loss trends
- **Payroll data** - Breakdown by classification and state
- **Employee count data** - Number of employees by classification
- **Coverage suggestions** - Current coverage analysis and recommendations
- **Research documents** - OSHA data, company information, industry insights

Extract ACTUAL data from these artifacts to build a comprehensive client profile. DO NOT use placeholder or generic data.

### STEP 2: Review Marketing Files

Check the uploaded marketing files for Workers' Compensation to identify carriers and their appetites:
- Carrier appetite guides showing industry preferences and restrictions
- Rate sheets and pricing information
- Underwriting guidelines and submission requirements
- Carrier program details and special features
- Coverage restrictions and exclusions
- State-specific carrier information

Marketing files are your PRIMARY source for current carrier appetite information.

### STEP 3: Match Carriers to Client Profile

Using the actual client profile from dependency tasks and carrier information from marketing files, identify carriers that meet ALL of these criteria:

**Industry Appetite**
- Carrier actively writes WC for the client's specific NAICS/SIC codes
- Client's industry is not on carrier's excluded or restricted list
- Carrier has proven track record in this industry segment
- Special programs available for this industry (if applicable)

**Geographic Appetite**
- Carrier is admitted/licensed in all required states
- States are within carrier's target geographic footprint
- Carrier maintains active market presence in the states
- No state-specific restrictions or moratoriums affecting this client

**Account Size & Risk Profile**
- Payroll amount fits within carrier's target range (minimum to maximum)
- Experience modification factor is acceptable to carrier (typically 0.75-1.30)
- Loss history aligns with carrier's risk tolerance
- Minimum premium requirements are met

**Competitive Factors**
- Carrier known for competitive WC pricing in this industry/state
- Loss sensitive programs available (if applicable for account size)
- Safety incentive or dividend programs offered
- Strong claim service and return-to-work programs

**Financial Strength**
- AM Best rating of A- (Excellent) or better
- Financially stable with consistent market presence
- No recent financial concerns or rating downgrades

### STEP 4: Prioritize and Rank Carriers

Categorize carriers into priority tiers based on strength of match:

1. **Best Fit** - Perfect appetite match across industry, state, size, and risk profile
2. **Strong Fit** - Good appetite with competitive programs, minor limitations acceptable
3. **Acceptable Fit** - Will consider but may have some restrictions or conditions
4. **Backup Options** - Consider only if primary options decline

## Output Format

Generate a structured carrier research document using the ACTUAL client data:

### CLIENT PROFILE SUMMARY
Extract from ALL available artifacts and present:
- Industry: [Actual NAICS/SIC] - [Actual business description]
- Operations: [Actual operations from submission package]
- States: [Actual states from ACORD forms]
- Payroll: [Actual total payroll from submission]
- Employees: [Actual employee count]
- Exp Mod: [Actual experience mod if available]
- Loss History: [Actual loss summary from loss runs]
- Class Codes: [Top 3-5 class codes by payroll]
- Special Factors: [Any unique characteristics from submission]

### IDENTIFIED CARRIERS

For each carrier, provide detailed analysis:

**[Carrier Name]** - Priority Level: [Best Fit / Strong Fit / Acceptable Fit / Backup]

- **Appetite Match**: [Excellent / Good / Fair] - Explain why
- **Industry Analysis**: [Specific appetite notes for this client's industry and operations]
- **Geographic Analysis**: [State-specific appetite and presence details]
- **Size/Payroll Fit**: [Carrier's preferred range vs. this client's actual payroll]
- **Experience Mod Tolerance**: [How carrier views this client's actual mod]
- **Loss History Consideration**: [How carrier will view this client's actual losses]
- **Special Programs**: [Specific WC programs, dividends, safety incentives this client qualifies for]
- **Financial Strength**: [AM Best rating and stability notes]
- **Submission Requirements**: [Specific requirements for this carrier]
- **Why Recommended**: [2-3 sentences on why this carrier is suited for THIS specific client]

### CARRIER SUMMARY TABLE

| Carrier | Priority | AM Best | Industry Match | State Match | Size Match | Key Advantages |
|---------|----------|---------|----------------|-------------|------------|----------------|
| [Name]  | [Tier]   | [A/A+]  | [E/G/F]        | [E/G/F]     | [E/G/F]    | [Brief notes]  |

### MARKETING STRATEGY RECOMMENDATION

Based on the client's actual profile and identified carriers:

**Primary Targets** (3-5 carriers):
List carriers with strong rationale based on actual client characteristics

**Secondary Options** (2-3 carriers):
List backup carriers and why they're being held as secondary

**Market Approach**:
Recommend simultaneous submission or tiered approach based on account characteristics and carrier appetites

**Timeline**:
Expected response timeframe based on carrier turnaround times and account complexity

**Differentiation Strategy**:
How to position this account to maximize appeal based on actual strengths from submission package

**Special Considerations**:
Any unique factors for this specific account that affect marketing strategy

### SUBMISSION REQUIREMENTS CHECKLIST

Based on identified carriers' requirements:
- [ ] [List actual forms needed - reference what's already in submission package]
- [ ] [List actual documentation needed - note what's complete vs. still needed]
- [ ] [Note any carrier-specific requirements not yet fulfilled]

### INFORMATION GAPS (If Any)

Only if there is genuinely missing information:
- [ ] [Specific missing data point] - Needed because [specific reason for this account]

## Critical Requirements

1. **NO PLACEHOLDER DATA**: Every data point must come from actual company artifacts or marketing files
2. **SPECIFIC CARRIER MATCHES**: Don't just list carriers - explain exactly why each fits THIS client
3. **USE ALL ARTIFACTS**: Review and reference ALL available artifacts (ACORD forms, narrative, loss runs, etc.)
4. **MARKETING FILES FIRST**: Check uploaded marketing files before making carrier recommendations
5. **ACCURATE CLIENT PROFILE**: Extract all client details from ACORD forms and submission documents
6. **REALISTIC ASSESSMENT**: Only recommend carriers that truly match the actual risk profile
7. **ACTIONABLE INTELLIGENCE**: Provide enough specificity that agent can immediately begin marketing

## Quality Standards

Your research demonstrates quality when it:
- Shows deep understanding of THIS client's specific business operations
- Matches carriers based on actual industry, state, payroll, and loss data
- References specific programs and features relevant to this client's profile
- Provides strategic prioritization with clear supporting rationale
- Identifies any gaps in information that could improve carrier selection
- Gives actionable next steps based on current state of submission package

## Example of Good vs Poor Output

**GOOD (Data-Driven)**:
"Travelers - Best Fit. Strong appetite for NAICS 238210 (Electrical Contractors) in California with payrolls $3M-$15M. Client's $4.2M payroll fits target range perfectly. Experience mod of 0.89 is below carrier's 1.0 threshold for preferred pricing. Client's 3-year loss ratio of 42% qualifies for Travelers' EquiGuard dividend program (potential 15% return). Five claims in three years with no single loss over $50K meets carrier's frequency tolerance. Requires ACORD 130, 131, CA specific endorsement, and 5-year loss runs (already in submission package). Contact regional underwriter John Smith for CA electrical accounts."

**POOR (Generic/Placeholder)**:
"Travelers - Good carrier for construction. A+ rated. Competitive pricing. Requires standard forms."

The good example uses ACTUAL client data (NAICS, payroll, mod, losses) and provides specific carrier intelligence. The poor example could apply to any account and provides no actionable value.
`;

const testCriteria = `• Client profile summary extracted from actual company artifacts (not placeholder data)
• All client details verified against available artifacts including ACORD 130, ACORD 125, narrative, loss runs, payroll data
• Minimum of 5 carriers identified with specific rationale based on actual client profile
• Each carrier analysis references actual client data (specific NAICS/SIC, actual payroll amount, actual mod, actual states)
• Carriers matched against actual client characteristics from available artifacts
• Marketing files reviewed and specific carrier programs/appetites referenced
• Carrier prioritization (Best/Strong/Acceptable/Backup) justified with concrete reasons
• Financial strength (AM Best ratings) documented for all recommended carriers
• Each carrier includes analysis of how client's actual risk profile fits carrier appetite
• Submission requirements mapped to what's already in package vs. still needed
• Marketing strategy tailored to this specific account's strengths and weaknesses
• No generic statements - all recommendations specific to this client's actual operations and risk profile`;

async function updateTask() {
  console.log('=== UPDATING CARRIER RESEARCH TASK ===\n');

  const taskRef = doc(db, 'tasks', templateId);

  await updateDoc(taskRef, {
    systemPrompt,
    testCriteria,
    updatedAt: new Date().toISOString()
  });

  console.log('Task updated successfully!');
  console.log('\nUpdated fields:');
  console.log('- System Prompt:', systemPrompt.length, 'characters');
  console.log('- Test Criteria:', testCriteria.length, 'characters');
  console.log('\nKey changes:');
  console.log('- Emphasizes using dependency task artifacts (submission package)');
  console.log('- Requires extracting ACTUAL client data, not placeholders');
  console.log('- References marketing files as primary carrier information source');
  console.log('- Test criteria validates use of actual data vs. generic statements');
  console.log('- Works for any company using this template');
  console.log('\nView at: http://localhost:9002/settings/task-settings/workers-comp/sKY8AVp6hj3pqZ957KTT');
}

updateTask()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
