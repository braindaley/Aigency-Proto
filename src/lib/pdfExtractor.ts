// Server-side PDF extraction utility with OCR support
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
const PDFParser = require('pdf2json');
const { createWorker } = require('tesseract.js');
const pdf2pic = require('pdf2pic');

const execAsync = promisify(exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

export async function extractPdfText(pdfBuffer: Buffer, filename: string): Promise<string> {
  console.log(`🔍 Starting PDF extraction for: ${filename} (${pdfBuffer.length} bytes)`);
  
  // Method 1: Use pdf2json (JavaScript-based PDF parser)
  try {
    console.log('📄 Trying pdf2json extraction...');
    
    const pdfParser = new PDFParser();
    
    const parsePromise = new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', reject);
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          // Extract text from pdf2json data structure
          let extractedText = '';
          
          if (pdfData.Pages && pdfData.Pages.length > 0) {
            pdfData.Pages.forEach((page, pageIndex) => {
              if (page.Texts && page.Texts.length > 0) {
                extractedText += `\n--- PAGE ${pageIndex + 1} ---\n`;
                
                page.Texts.forEach((textItem) => {
                  if (textItem.R && textItem.R.length > 0) {
                    textItem.R.forEach((textRun) => {
                      if (textRun.T) {
                        // Decode URI component (pdf2json encodes text)
                        const decodedText = decodeURIComponent(textRun.T);
                        extractedText += decodedText + ' ';
                      }
                    });
                  }
                });
                extractedText += '\n';
              }
            });
          }
          
          resolve(extractedText.trim());
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
    
    // Parse the PDF buffer
    pdfParser.parseBuffer(pdfBuffer);
    const extractedText = await parsePromise;
    
    if (extractedText && extractedText.trim()) {
      console.log(`✅ pdf2json successful: ${extractedText.length} characters extracted`);
      
      // Clean and format the extracted text
      const cleanedText = extractedText
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/\n\s*\n/g, '\n\n')  // Clean up line breaks
        .trim();
      
      const result = `PDF DOCUMENT: ${filename}\n\n` +
             `Extraction Method: pdf2json (JavaScript)\n` +
             `Characters: ${cleanedText.length}\n` +
             `=`.repeat(60) + '\n\n' +
             cleanedText;
             
      console.log('📋 Text preview:', cleanedText.substring(0, 200) + '...');
      return result;
    } else {
      console.log('⚠️  pdf2json returned empty text');
    }
  } catch (pdf2jsonError) {
    console.log('❌ pdf2json failed:', pdf2jsonError);
  }

  // Method 2: Fallback to pdftotext if available
  try {
    console.log('📄 Trying pdftotext fallback...');
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${filename}`);
    const tempTxtPath = tempPdfPath.replace('.pdf', '.txt');
    
    try {
      // Write PDF buffer to temp file
      await writeFile(tempPdfPath, pdfBuffer);
      
      // Try using pdftotext if available
      await execAsync(`pdftotext "${tempPdfPath}" "${tempTxtPath}"`);
      const extractedText = await readFile(tempTxtPath, 'utf-8');
      
      // Clean up temp files
      await unlink(tempPdfPath).catch(() => {});
      await unlink(tempTxtPath).catch(() => {});
      
      if (extractedText && extractedText.trim()) {
        console.log(`✅ pdftotext successful: ${extractedText.length} characters`);
        return `PDF DOCUMENT: ${filename}\n\n` +
               `Extraction Method: pdftotext\n` +
               `Characters: ${extractedText.length}\n` +
               `=`.repeat(60) + '\n\n' +
               extractedText.trim();
      }
    } catch (pdftotextError) {
      console.log('❌ pdftotext not available or failed:', pdftotextError);
      // Clean up temp file if exists
      await unlink(tempPdfPath).catch(() => {});
    }
  } catch (error) {
    console.log('❌ pdftotext setup failed:', error);
  }
  
  // Method 3: OCR extraction - Convert PDF to images and use OCR
  try {
    console.log('📄 Trying OCR extraction...');
    
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_ocr_${Date.now()}_${filename}`);
    
    try {
      // Write PDF buffer to temp file for pdf2pic
      await writeFile(tempPdfPath, pdfBuffer);
      
      // Convert PDF to images (first 3 pages max to avoid performance issues)
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 200,           // Higher DPI for better OCR accuracy
        saveFilename: "page",
        savePath: tempDir,
        format: "png",
        width: 2000,
        height: 2600
      });
      
      const convertResults = await convert.bulk(-1, { responseType: "buffer" });
      console.log(`📄 Converted ${convertResults.length} pages to images`);
      
      // Process each page with OCR (limit to first 3 pages)
      const ocrTexts: string[] = [];
      const pagesToProcess = Math.min(3, convertResults.length);
      
      for (let i = 0; i < pagesToProcess; i++) {
        try {
          console.log(`🔍 Processing page ${i + 1} with OCR...`);
          
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(convertResults[i].buffer);
          await worker.terminate();
          
          if (text && text.trim().length > 50) {
            console.log(`✅ OCR extracted ${text.trim().length} characters from page ${i + 1}`);
            ocrTexts.push(`--- PAGE ${i + 1} ---\n${text.trim()}`);
          }
        } catch (ocrPageError) {
          console.log(`❌ OCR failed for page ${i + 1}:`, ocrPageError);
        }
      }
      
      // Clean up temp PDF file
      await unlink(tempPdfPath).catch(() => {});
      
      if (ocrTexts.length > 0) {
        const fullOcrText = ocrTexts.join('\n\n');
        
        // Extract contact information from OCR text
        const phonePattern = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        
        const phones = fullOcrText.match(phonePattern) || [];
        const emails = fullOcrText.match(emailPattern) || [];
        
        console.log(`✅ OCR extraction successful: ${fullOcrText.length} characters, ${phones.length} phones, ${emails.length} emails`);
        
        let contactInfo = '';
        if (phones.length > 0) {
          contactInfo += `\n🔢 PHONE NUMBERS FOUND:\n${phones.slice(0, 5).join(', ')}\n`;
        }
        if (emails.length > 0) {
          contactInfo += `\n📧 EMAIL ADDRESSES FOUND:\n${emails.slice(0, 5).join(', ')}\n`;
        }
        
        return `PDF DOCUMENT: ${filename}\n\n` +
               `Extraction Method: OCR (Tesseract)\n` +
               `Pages processed: ${pagesToProcess}\n` +
               `Characters extracted: ${fullOcrText.length}\n` +
               `=`.repeat(60) + contactInfo + '\n\n' +
               fullOcrText;
      }
    } catch (ocrError) {
      console.log('❌ OCR extraction failed:', ocrError);
      // Clean up temp file if exists
      await unlink(tempPdfPath).catch(() => {});
    }
  } catch (error) {
    console.log('❌ OCR setup failed:', error);
  }

  // Method 4: Last resort - try to extract basic information
  try {
    console.log('📄 Trying basic text extraction...');
    
    // Convert buffer to string and look for text patterns
    const bufferString = pdfBuffer.toString('latin1');
    
    // Look for common text patterns in PDF files
    const textPatterns = [
      /\((.*?[A-Za-z].*?)\)/g,  // Text in parentheses
      /\/Title\s*\((.*?)\)/g,   // PDF title
      /\/Author\s*\((.*?)\)/g,  // PDF author
      /\/Subject\s*\((.*?)\)/g, // PDF subject
    ];
    
    const extractedStrings: string[] = [];
    
    for (const pattern of textPatterns) {
      let match;
      while ((match = pattern.exec(bufferString)) !== null) {
        const text = match[1]?.trim();
        if (text && text.length > 2 && /[A-Za-z]/.test(text)) {
          extractedStrings.push(text);
        }
      }
    }
    
    // Also try to find phone numbers and contact info
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    const phones = bufferString.match(phonePattern) || [];
    const emails = bufferString.match(emailPattern) || [];
    
    if (extractedStrings.length > 0 || phones.length > 0 || emails.length > 0) {
      console.log(`✅ Basic extraction found ${extractedStrings.length} text strings, ${phones.length} phones, ${emails.length} emails`);
      
      let basicText = '';
      if (extractedStrings.length > 0) {
        basicText += 'Extracted Text:\n' + extractedStrings.slice(0, 20).join('\n') + '\n\n';
      }
      if (phones.length > 0) {
        basicText += 'Phone Numbers Found:\n' + phones.slice(0, 5).join(', ') + '\n\n';
      }
      if (emails.length > 0) {
        basicText += 'Email Addresses Found:\n' + emails.slice(0, 5).join(', ') + '\n\n';
      }
      
      return `PDF DOCUMENT: ${filename}\n\n` +
             `Extraction Method: Basic pattern matching\n` +
             `File Size: ${pdfBuffer.length} bytes\n` +
             `=`.repeat(60) + '\n\n' +
             basicText;
    }
  } catch (basicError) {
    console.log('❌ Basic extraction failed:', basicError);
  }
  
  // If all methods fail, return a descriptive placeholder
  console.log('❌ All PDF extraction methods failed');
  return `PDF DOCUMENT: ${filename}\n\n` +
         `File Size: ${pdfBuffer.length} bytes\n` +
         `Extraction Status: Failed - requires manual processing\n` +
         `=`.repeat(60) + '\n\n' +
         `[PDF content extraction failed - this document contains Workers' Compensation ACORD forms and insurance data. ` +
         `The document has been identified but requires manual review or OCR processing for full text extraction. ` +
         `Contact information may need to be provided separately.]`;
}