import * as XLSX from 'xlsx';

const filePath = '/Users/briandaley/Downloads/workers-comp-test-data (1)/loss-runs-3-5-years-chat-upload.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(sheet);

console.log('=== DETAILED LOSS RUNS DATA ANALYSIS ===\n');
console.log(`Total rows in file: ${data.length}`);

// Show all column names from first row
console.log('\n📋 Columns in data:');
const firstRow = data[0] as any;
Object.keys(firstRow).forEach((key, i) => {
    console.log(`  ${i + 1}. ${key}`);
});

// Look for actual claim rows (rows with claim numbers or dates of loss)
let actualClaims = 0;
let claimRows: any[] = [];
let totalIncurred = 0;

for (const row of data) {
    const rowData = row as any;

    // Check if this row looks like an actual claim (has a claim number or date of loss)
    const hasClaimNumber = Object.keys(rowData).some(key =>
        key.toLowerCase().includes('claim') && rowData[key] && String(rowData[key]).trim()
    );

    const hasDateOfLoss = Object.keys(rowData).some(key =>
        key.toLowerCase().includes('date') && key.toLowerCase().includes('loss') && rowData[key]
    );

    if (hasClaimNumber || hasDateOfLoss) {
        actualClaims++;
        claimRows.push(rowData);

        // Try to find incurred amount
        for (const key in rowData) {
            if (key.toLowerCase().includes('incurred') && typeof rowData[key] === 'number') {
                totalIncurred += rowData[key];
            }
        }
    }
}

console.log(`\n✅ ACTUAL CLAIMS (filtered): ${actualClaims}`);
console.log(`💰 Total Incurred: $${totalIncurred.toFixed(2)}`);

console.log('\n📊 Sample claims (first 5):');
claimRows.slice(0, 5).forEach((row, i) => {
    console.log(`\n  Claim ${i + 1}:`);
    Object.entries(row).slice(0, 8).forEach(([key, value]) => {
        if (value && String(value).trim()) {
            console.log(`    ${key}: ${value}`);
        }
    });
});

console.log('\n\n=================================');
console.log('COMPARISON WITH NARRATIVE:');
console.log('=================================');
console.log(`Narrative: 18 claims over 2019-2024`);
console.log(`Actual: ${actualClaims} claims`);
console.log(`Match: ${actualClaims === 18 ? '✓ PERFECT MATCH' : `✗ Difference: ${actualClaims - 18}`}`);
console.log('');
console.log(`Narrative: $182,557 total incurred`);
console.log(`Actual: $${totalIncurred.toFixed(2)} total incurred`);
const incurredMatch = Math.abs(totalIncurred - 182557) < 1;
console.log(`Match: ${incurredMatch ? '✓ PERFECT MATCH' : `✗ Difference: $${Math.abs(totalIncurred - 182557).toFixed(2)}`}`);
