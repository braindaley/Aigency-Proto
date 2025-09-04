import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function parseFileContent(file: File): Promise<{ content: string; type: string; data?: any }> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // Excel files
    if (fileType.includes('spreadsheet') || 
        fileName.endsWith('.xlsx') || 
        fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const csvString = XLSX.utils.sheet_to_csv(worksheet);
      
      return {
        content: csvString,
        type: 'excel',
        data: jsonData
      };
    }
    
    // CSV files
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      const text = await file.text();
      
      return new Promise((resolve) => {
        Papa.parse(text, {
          complete: (results) => {
            resolve({
              content: text,
              type: 'csv',
              data: results.data
            });
          },
          error: (error) => {
            resolve({
              content: text,
              type: 'csv',
              data: null
            });
          }
        });
      });
    }
    
    // Text files
    if (fileType.includes('text') || 
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md')) {
      const text = await file.text();
      return {
        content: text,
        type: 'text',
        data: text
      };
    }
    
    // JSON files
    if (fileName.endsWith('.json')) {
      const text = await file.text();
      try {
        const jsonData = JSON.parse(text);
        return {
          content: JSON.stringify(jsonData, null, 2),
          type: 'json',
          data: jsonData
        };
      } catch {
        return {
          content: text,
          type: 'text',
          data: text
        };
      }
    }
    
    // PDF files (basic metadata only - full parsing would require additional library)
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return {
        content: `PDF file: ${file.name} (${(file.size / 1024).toFixed(2)} KB). Note: Full PDF content extraction requires additional processing.`,
        type: 'pdf',
        data: null
      };
    }
    
    // Default: return basic file info
    return {
      content: `File: ${file.name}, Type: ${file.type}, Size: ${(file.size / 1024).toFixed(2)} KB`,
      type: 'binary',
      data: null
    };
    
  } catch (error) {
    console.error('Error parsing file:', error);
    return {
      content: `Error reading file: ${file.name}`,
      type: 'error',
      data: null
    };
  }
}

export function formatFileDataForChat(parsedFile: { content: string; type: string; data?: any }): string {
  const MAX_CONTENT_LENGTH = 2000; // Limit content to prevent context overflow
  
  switch (parsedFile.type) {
    case 'excel':
    case 'csv':
      if (parsedFile.data && Array.isArray(parsedFile.data)) {
        const rows = parsedFile.data.slice(0, 10); // Reduced to first 10 rows for preview
        const totalRows = parsedFile.data.length;
        let formatted = `Spreadsheet data (${totalRows} rows total):\n\n`;
        
        // Format rows with truncation for long rows
        formatted += rows.map((row: any, index: number) => {
          let rowStr = '';
          if (Array.isArray(row)) {
            rowStr = row.map(cell => String(cell).substring(0, 50)).join(', ');
          } else {
            rowStr = JSON.stringify(row).substring(0, 200);
          }
          return `Row ${index + 1}: ${rowStr}`;
        }).join('\n');
        
        if (totalRows > 10) {
          formatted += `\n... and ${totalRows - 10} more rows`;
        }
        
        // Ensure content doesn't exceed max length
        if (formatted.length > MAX_CONTENT_LENGTH) {
          formatted = formatted.substring(0, MAX_CONTENT_LENGTH - 20) + '\n... [truncated]';
        }
        
        return formatted;
      }
      // Truncate raw CSV content if too long
      if (parsedFile.content.length > MAX_CONTENT_LENGTH) {
        return parsedFile.content.substring(0, MAX_CONTENT_LENGTH - 20) + '\n... [truncated]';
      }
      return parsedFile.content;
      
    case 'json':
      return `JSON data:\n${parsedFile.content}`;
      
    case 'text':
      return `Text content:\n${parsedFile.content}`;
      
    default:
      return parsedFile.content;
  }
}