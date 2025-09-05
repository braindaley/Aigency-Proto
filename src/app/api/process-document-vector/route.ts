import { NextRequest, NextResponse } from 'next/server';
import { VectorService } from '@/lib/vectorService';
import { processDocument } from '@/lib/documentProcessor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const documentId = formData.get('documentId') as string;

    if (!file || !companyId || !documentId) {
      return NextResponse.json(
        { error: 'Missing file, companyId, or documentId' },
        { status: 400 }
      );
    }

    console.log(`Processing document for vector storage: ${file.name}`);
    
    // Process the document to extract text content
    const processedDoc = await processDocument(file);
    
    if (!processedDoc.content || processedDoc.content.includes('[Error') || processedDoc.content.includes('[Unsupported')) {
      console.log(`Document ${file.name} could not be processed for text extraction`);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Document could not be processed for text extraction',
          details: processedDoc.content 
        }
      );
    }

    // Store the document in vector database
    await VectorService.processDocument(
      companyId,
      documentId,
      file.name,
      processedDoc.content,
      processedDoc.type
    );

    console.log(`✅ Successfully processed ${file.name} for vector search`);
    
    return NextResponse.json({
      success: true,
      message: `Document ${file.name} successfully processed for vector search`,
      documentInfo: {
        filename: processedDoc.filename,
        type: processedDoc.type,
        size: processedDoc.size,
        contentLength: processedDoc.content.length
      }
    });

  } catch (error) {
    console.error('Error processing document for vectors:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process document for vector storage',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Process existing documents endpoint
export async function PUT(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId' },
        { status: 400 }
      );
    }

    console.log(`Processing existing documents for company: ${companyId}`);
    
    await VectorService.processExistingDocuments(companyId);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully processed existing documents for vector search'
    });

  } catch (error) {
    console.error('Error processing existing documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process existing documents',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}