import { NextRequest, NextResponse } from 'next/server';
import { extractPdfText } from '@/lib/pdfExtractor';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing OCR extraction endpoint...');
    
    // For testing, we'll try to fetch one of the PDF documents from Firebase Storage
    // You would normally pass a PDF buffer, but for testing we'll simulate it
    
    const { pdfUrl, filename } = await request.json();
    
    if (!pdfUrl || !filename) {
      return NextResponse.json(
        { error: 'Missing pdfUrl or filename' },
        { status: 400 }
      );
    }
    
    console.log(`📄 Fetching PDF from: ${pdfUrl}`);
    
    // Fetch the PDF file
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    console.log(`📄 PDF loaded: ${pdfBuffer.length} bytes`);
    
    // Extract text using our enhanced extractor with OCR
    const extractedText = await extractPdfText(pdfBuffer, filename);
    
    // Analyze the extracted content
    const phonePattern = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    const phones = extractedText.match(phonePattern) || [];
    const emails = extractedText.match(emailPattern) || [];
    
    return NextResponse.json({
      success: true,
      filename,
      extractedTextLength: extractedText.length,
      extractedTextPreview: extractedText.substring(0, 1000),
      contactInfo: {
        phonesFound: phones.length,
        emailsFound: emails.length,
        phones: phones.slice(0, 5),
        emails: emails.slice(0, 5)
      },
      extractionMethod: extractedText.includes('OCR (Tesseract)') ? 'OCR' : 
                        extractedText.includes('pdf2json') ? 'pdf2json' : 
                        extractedText.includes('pdftotext') ? 'pdftotext' : 'other',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error testing OCR:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test OCR',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'OCR Test Endpoint - Use POST with pdfUrl and filename to test OCR extraction',
    usage: {
      method: 'POST',
      body: {
        pdfUrl: 'https://firebasestorage.googleapis.com/...',
        filename: 'document.pdf'
      }
    }
  });
}