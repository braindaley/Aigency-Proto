// Server-side Excel extraction utility
import * as XLSX from 'xlsx';

export async function extractExcelText(excelBuffer: Buffer, filename: string): Promise<string> {
  console.log(`🔍 Starting Excel extraction for: ${filename} (${excelBuffer.length} bytes)`);

  try {
    // Parse the Excel file from buffer
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' });

    console.log(`📊 Excel file has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

    let extractedText = `EXCEL DOCUMENT: ${filename}\n\n`;
    extractedText += `File Size: ${excelBuffer.length} bytes\n`;
    extractedText += `Number of Sheets: ${workbook.SheetNames.length}\n`;
    extractedText += `Sheet Names: ${workbook.SheetNames.join(', ')}\n`;
    extractedText += `=`.repeat(60) + '\n\n';

    // Process each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`📄 Processing sheet ${index + 1}: ${sheetName}`);

      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to CSV format (preserves structure)
      const csvData = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' }); // Use tab separator for better formatting

      // Also convert to JSON for structured data
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      extractedText += `\n${'='.repeat(60)}\n`;
      extractedText += `SHEET ${index + 1}: ${sheetName}\n`;
      extractedText += `${'='.repeat(60)}\n\n`;

      // Add CSV format (easier for AI to read as table)
      extractedText += `TABLE FORMAT:\n`;
      extractedText += csvData + '\n\n';

      // Add row count and column count
      const rowCount = jsonData.length;
      const colCount = rowCount > 0 ? Math.max(...jsonData.map((row: any) => row.length)) : 0;

      extractedText += `\nSheet Statistics:\n`;
      extractedText += `- Rows: ${rowCount}\n`;
      extractedText += `- Columns: ${colCount}\n`;
      extractedText += `- Data Points: ${rowCount * colCount}\n\n`;

      console.log(`✅ Sheet "${sheetName}" processed: ${rowCount} rows, ${colCount} columns`);
    });

    console.log(`✅ Excel extraction successful: ${extractedText.length} characters total`);

    return extractedText;

  } catch (error) {
    console.error('❌ Excel extraction failed:', error);

    return `EXCEL DOCUMENT: ${filename}\n\n` +
           `File Size: ${excelBuffer.length} bytes\n` +
           `Extraction Status: Failed\n` +
           `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
           `=`.repeat(60) + '\n\n' +
           `[Excel content extraction failed - the document could not be parsed. ` +
           `This may be due to file corruption or an unsupported Excel format.]`;
  }
}
