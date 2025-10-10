import * as XLSX from 'xlsx';

const filePath = '/Users/briandaley/Downloads/workers-comp-test-data (1)/loss-runs-3-5-years-chat-upload.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('=== RAW SHEET ANALYSIS ===\n');

// Get sheet range
const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
console.log(`Sheet range: ${sheet['!ref']}`);
console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);

// Show first 30 rows with all columns
console.log('\n📋 First 30 rows (all columns):');
for (let R = range.s.r; R <= Math.min(range.e.r, 29); ++R) {
    let rowData = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : '';
        if (value) rowData.push(`Col${String.fromCharCode(65 + C)}: ${value}`);
    }
    if (rowData.length > 0) {
        console.log(`Row ${R + 1}: ${rowData.join(' | ')}`);
    }
}

// Try to detect header row and data rows
console.log('\n\n🔍 Detecting structure...');

// Try CSV-like parsing with header detection
const csvData = XLSX.utils.sheet_to_csv(sheet);
const lines = csvData.split('\n').filter(line => line.trim());
console.log(`\nTotal non-empty lines: ${lines.length}`);
console.log('\nFirst 10 lines:');
lines.slice(0, 10).forEach((line, i) => {
    console.log(`${i + 1}: ${line.substring(0, 150)}`);
});
