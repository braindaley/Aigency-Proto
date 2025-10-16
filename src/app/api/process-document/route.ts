import { NextRequest, NextResponse } from 'next/server';
import { DocumentProcessingService } from '@/lib/documentProcessingService';

/**
 * API endpoint to process a document and extract its text content
 * This can be called after a document is uploaded to Firebase Storage
 */
export async function POST(req: NextRequest) {
  try {
    const { companyId, documentId, fileUrl, filename, fileType } = await req.json();

    // Validate required fields
    if (!companyId || !documentId || !fileUrl || !filename || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, documentId, fileUrl, filename, fileType' },
        { status: 400 }
      );
    }

    console.log(`Processing document request: ${filename} for company ${companyId}`);

    // Process the document
    const result = await DocumentProcessingService.processDocumentFromUrl(
      companyId,
      documentId,
      fileUrl,
      filename,
      fileType
    );

    if (result.processingStatus === 'failed') {
      return NextResponse.json(
        {
          success: false,
          error: result.processingError,
          processingStatus: result.processingStatus
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      processingStatus: result.processingStatus,
      contentLength: result.contentLength,
      processedAt: result.processedAt.toISOString()
    });
  } catch (error) {
    console.error('Error in process-document API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
