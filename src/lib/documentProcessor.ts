// Document processing utility for extracting text content from various file types
import * as XLSX from 'xlsx';

export interface ProcessedDocument {
  filename: string;
  content: string;
  type: string;
  size: number;
}

export async function processDocument(file: File): Promise<ProcessedDocument> {
  const filename = file.name;
  const type = file.type;
  const size = file.size;

  let content = '';

  try {
    if (type === 'text/plain' || filename.endsWith('.txt')) {
      // Plain text files
      content = await file.text();
    } else if (type === 'application/pdf' || filename.endsWith('.pdf')) {
      // PDF files - we'll extract text using a simple approach
      content = await extractTextFromPDF(file);
    } else if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      // DOCX files
      content = await extractTextFromDocx(file);
    } else if (
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      filename.endsWith('.xlsx')
    ) {
      // XLSX files
      content = await extractTextFromXlsx(file);
    } else if (filename.endsWith('.xls')) {
      // XLS files
      content = await extractTextFromXls(file);
    } else if (
      type === 'application/msword' ||
      filename.endsWith('.doc')
    ) {
      // DOC files
      content = await extractTextFromDoc(file);
    } else if (type.startsWith('image/')) {
      // Image files
      content = `[Image file: ${filename} - Content analysis would require OCR]`;
    } else {
      // Unsupported file type - try to read as text
      try {
        content = await file.text();
      } catch {
        content = `[Unsupported file type: ${type} - Unable to extract text content]`;
      }
    }
  } catch (error) {
    console.error('Error processing document:', error);
    content = `[Error processing file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }

  return {
    filename,
    content,
    type,
    size
  };
}

async function extractTextFromPDF(file: File): Promise<string> {
  // For now, return a placeholder - would need pdf-parse or similar library for full PDF parsing
  return `[PDF Document: ${file.name} - PDF text extraction would require additional libraries. File size: ${file.size} bytes. Please describe the content of this document in your message.]`;
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    // For DOCX, we can try to read as zip and extract the document.xml
    // This is a simplified approach - would need mammoth.js or similar for full support
    const arrayBuffer = await file.arrayBuffer();
    
    // For now, return a placeholder
    return `[DOCX Document: ${file.name} - Word document text extraction would require additional libraries. File size: ${file.size} bytes. Please describe the content of this document in your message.]`;
  } catch (error) {
    return `[Error reading DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

async function extractTextFromXlsx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let content = `EXCEL SPREADSHEET: ${file.name}\n\n`;
    
    // Process each worksheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to CSV format to preserve structure
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      if (csvData.trim()) {
        content += `SHEET ${index + 1}: ${sheetName}\n`;
        content += '='.repeat(50) + '\n';
        content += csvData;
        content += '\n\n';
      }
    });
    
    if (content === `EXCEL SPREADSHEET: ${file.name}\n\n`) {
      content += '[Empty spreadsheet or no readable data found]';
    }
    
    return content;
  } catch (error) {
    return `[Error reading XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

async function extractTextFromXls(file: File): Promise<string> {
  try {
    // XLS files can also be processed by the xlsx library
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let content = `EXCEL SPREADSHEET (Legacy): ${file.name}\n\n`;
    
    // Process each worksheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to CSV format to preserve structure
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      if (csvData.trim()) {
        content += `SHEET ${index + 1}: ${sheetName}\n`;
        content += '='.repeat(50) + '\n';
        content += csvData;
        content += '\n\n';
      }
    });
    
    if (content === `EXCEL SPREADSHEET (Legacy): ${file.name}\n\n`) {
      content += '[Empty spreadsheet or no readable data found]';
    }
    
    return content;
  } catch (error) {
    return `[Error reading XLS file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

async function extractTextFromDoc(file: File): Promise<string> {
  try {
    // For DOC (legacy Word format)
    return `[DOC Document: ${file.name} - Legacy Word document text extraction would require additional libraries. File size: ${file.size} bytes. Please describe the content of this document in your message.]`;
  } catch (error) {
    return `[Error reading DOC file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

export function getFileTypeDescription(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'pdf':
      return 'PDF Document';
    case 'docx':
    case 'doc':
      return 'Word Document';
    case 'xlsx':
    case 'xls':
      return 'Excel Spreadsheet';
    case 'txt':
      return 'Text File';
    case 'jpg':
    case 'jpeg':
    case 'png':
      return 'Image File';
    default:
      return 'Document';
  }
}