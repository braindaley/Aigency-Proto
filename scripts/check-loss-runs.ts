import * as XLSX from 'xlsx';

const filePath = '/Users/briandaley/Downloads/workers-comp-test-data (1)/loss-runs-3-5-years-chat-upload.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(sheet);

console.log('=== LOSS RUNS DATA ANALYSIS ===\n');
console.log(`Total claims in file: ${data.length}`);

// Calculate total incurred
let totalIncurred = 0;
let incurredKey = '';

// Find the incurred column
const firstRow = data[0] as any;
for (const key in firstRow) {
    if (key.toLowerCase().includes('incurred')) {
        incurredKey = key;
        break;
    }
}

if (incurredKey) {
    console.log(`Found incurred column: "${incurredKey}"`);

    for (const row of data) {
        const value = (row as any)[incurredKey];
        if (typeof value === 'number') {
            totalIncurred += value;
        }
    }

    console.log(`Total Incurred: $${totalIncurred.toFixed(2)}`);
}

console.log('\n📋 First 3 claims:');
data.slice(0, 3).forEach((row: any, i) => {
    console.log(`\nClaim ${i + 1}:`);
    Object.entries(row).slice(0, 6).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
});

console.log('\n✅ COMPARISON WITH NARRATIVE:');
console.log(`   Narrative: 18 claims | Actual data: ${data.length} claims | Match: ${data.length === 18 ? '✓' : '✗'}`);
if (incurredKey) {
    const matchesIncurred = Math.abs(totalIncurred - 182557) < 1;
    console.log(`   Narrative: $182,557 | Actual data: $${totalIncurred.toFixed(2)} | Match: ${matchesIncurred ? '✓' : '✗'}`);
}

// Check for year range
console.log('\n📅 Year range check:');
let yearKey = '';
for (const key in firstRow) {
    if (key.toLowerCase().includes('year') || key.toLowerCase().includes('date')) {
        yearKey = key;
        break;
    }
}

if (yearKey) {
    const years = data.map((row: any) => {
        const val = row[yearKey];
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const match = val.match(/20\d{2}/);
            return match ? parseInt(match[0]) : null;
        }
        return null;
    }).filter(y => y !== null);

    console.log(`   Years found: ${Math.min(...years as number[])} - ${Math.max(...years as number[])}`);
    console.log(`   Narrative states: 2019-2024`);
}
