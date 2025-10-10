import * as XLSX from 'xlsx';

const filePath = '/Users/briandaley/Downloads/workers-comp-test-data (1)/payroll-by-classification-chat-upload.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('=== PAYROLL BY CLASSIFICATION ANALYSIS ===\n');

// Get sheet range
const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
console.log(`Sheet range: ${sheet['!ref']}`);
console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);

// Show all rows
console.log('\n📋 All rows:');
let totalPayroll = 0;
for (let R = range.s.r; R <= range.e.r; ++R) {
    let rowData: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : '';
        if (value) {
            rowData.push(`${value}`);

            // Try to find payroll amounts (numeric values > 1000)
            if (typeof value === 'number' && value > 1000 && R > 5) {
                // This might be a payroll figure
                // Look for the word "payroll" or "annual" in the same row or nearby
                const isPayrollRow = rowData.some(v =>
                    String(v).toLowerCase().includes('payroll') ||
                    String(v).toLowerCase().includes('annual')
                );
                if (isPayrollRow || R > 7) {  // Assume data rows start after row 7
                    totalPayroll += value;
                }
            }
        }
    }
    if (rowData.length > 0) {
        console.log(`Row ${R + 1}: ${rowData.join(' | ')}`);
    }
}

console.log(`\n\n💰 Estimated Total Annual Payroll: $${totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`\n✅ COMPARISON WITH NARRATIVE:`);
console.log(`   Narrative: $1,368,731`);
console.log(`   Actual: $${totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`   Match: ${Math.abs(totalPayroll - 1368731) < 1 ? '✓ PERFECT MATCH' : `✗ Difference: $${Math.abs(totalPayroll - 1368731).toFixed(2)}`}`);
