/**
 * Document Processing Service
 *
 * This service handles the extraction and pre-processing of document content
 * when files are uploaded to Firebase Storage. It processes PDFs, Excel files,
 * and Word documents, extracting their text content and storing it in Firestore
 * for fast retrieval during AI context generation.
 */

import { db } from './firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

export interface ProcessedDocumentData {
  extractedText: string;
  processedAt: Date;
  processingStatus: 'success' | 'failed' | 'pending';
  processingError?: string;
  contentLength: number;
}

export class DocumentProcessingService {
  /**
   * Process a document and extract its text content
   * @param fileBuffer - The file buffer to process
   * @param filename - The name of the file
   * @param fileType - The MIME type of the file
   * @returns Extracted text content
   */
  static async extractTextFromFile(
    fileBuffer: Buffer,
    filename: string,
    fileType: string
  ): Promise<string> {
    const lowerFilename = filename.toLowerCase();
    const isPDF = lowerFilename.endsWith('.pdf') || fileType === 'application/pdf';
    const isExcel = lowerFilename.endsWith('.xlsx') ||
                   lowerFilename.endsWith('.xls') ||
                   fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   fileType === 'application/vnd.ms-excel';
    const isWord = lowerFilename.endsWith('.docx') ||
                  lowerFilename.endsWith('.doc') ||
                  fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                  fileType === 'application/msword';

    try {
      if (isPDF) {
        console.log(`📄 Processing PDF: ${filename}`);
        const { extractPdfText } = await import('./pdfExtractor');
        return await extractPdfText(fileBuffer, filename);
      } else if (isExcel) {
        console.log(`📊 Processing Excel: ${filename}`);
        const { extractExcelText } = await import('./excelExtractor');
        return await extractExcelText(fileBuffer, filename);
      } else if (isWord) {
        console.log(`📝 Processing Word document: ${filename}`);
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });

        if (result.value && result.value.trim()) {
          return `WORD DOCUMENT: ${filename}\n\n` +
                 `File Size: ${fileBuffer.length} bytes\n` +
                 `${'='.repeat(60)}\n\n` +
                 result.value.trim();
        } else {
          return `WORD DOCUMENT: ${filename}\n\nFile Size: ${fileBuffer.length} bytes\n${'='.repeat(60)}\n\n[No readable text content found in document]`;
        }
      } else {
        // For text files or other formats, try to read as text
        if (fileType.startsWith('text/') || lowerFilename.endsWith('.txt') || lowerFilename.endsWith('.csv')) {
          console.log(`📝 Processing text file: ${filename}`);
          return `TEXT FILE: ${filename}\n\n${fileBuffer.toString('utf-8')}`;
        }

        console.log(`⚠️ Unsupported file type for ${filename}: ${fileType}`);
        return `FILE: ${filename}\n\nFile Type: ${fileType}\nFile Size: ${fileBuffer.length} bytes\n\n[File type not supported for text extraction]`;
      }
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Process a document from a URL and store the extracted text in Firestore
   * @param companyId - The company ID
   * @param documentId - The document ID
   * @param fileUrl - The URL of the file in Firebase Storage
   * @param filename - The name of the file
   * @param fileType - The MIME type of the file
   */
  static async processDocumentFromUrl(
    companyId: string,
    documentId: string,
    fileUrl: string,
    filename: string,
    fileType: string
  ): Promise<ProcessedDocumentData> {
    try {
      console.log(`🔄 Processing document ${filename} (ID: ${documentId})`);

      // Fetch the file from the URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Extract text
      const extractedText = await this.extractTextFromFile(fileBuffer, filename, fileType);

      // Prepare the processed data
      const processedData: ProcessedDocumentData = {
        extractedText,
        processedAt: new Date(),
        processingStatus: 'success',
        contentLength: extractedText.length
      };

      // Store the extracted text in Firestore
      const docRef = doc(db, `companies/${companyId}/documents`, documentId);
      await updateDoc(docRef, {
        extractedText: processedData.extractedText,
        processedAt: processedData.processedAt,
        processingStatus: processedData.processingStatus,
        contentLength: processedData.contentLength
      });

      console.log(`✅ Document processed successfully: ${filename} (${extractedText.length} characters)`);

      return processedData;
    } catch (error) {
      console.error(`❌ Error processing document ${filename}:`, error);

      // Store the error in Firestore
      const processedData: ProcessedDocumentData = {
        extractedText: '',
        processedAt: new Date(),
        processingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Unknown error',
        contentLength: 0
      };

      try {
        const docRef = doc(db, `companies/${companyId}/documents`, documentId);
        await updateDoc(docRef, {
          processingStatus: processedData.processingStatus,
          processingError: processedData.processingError,
          processedAt: processedData.processedAt
        });
      } catch (updateError) {
        console.error('Failed to update processing error status:', updateError);
      }

      return processedData;
    }
  }

  /**
   * Process a document directly from a file buffer and return the extracted text
   * Used during upload to process the file before storing it
   * @param fileBuffer - The file buffer to process
   * @param filename - The name of the file
   * @param fileType - The MIME type of the file
   * @returns ProcessedDocumentData
   */
  static async processDocumentFromBuffer(
    fileBuffer: Buffer,
    filename: string,
    fileType: string
  ): Promise<ProcessedDocumentData> {
    try {
      console.log(`🔄 Processing document ${filename} from buffer`);

      const extractedText = await this.extractTextFromFile(fileBuffer, filename, fileType);

      const processedData: ProcessedDocumentData = {
        extractedText,
        processedAt: new Date(),
        processingStatus: 'success',
        contentLength: extractedText.length
      };

      console.log(`✅ Document processed from buffer: ${filename} (${extractedText.length} characters)`);

      return processedData;
    } catch (error) {
      console.error(`❌ Error processing document ${filename} from buffer:`, error);

      return {
        extractedText: '',
        processedAt: new Date(),
        processingStatus: 'failed',
        processingError: error instanceof Error ? error.message : 'Unknown error',
        contentLength: 0
      };
    }
  }
}
