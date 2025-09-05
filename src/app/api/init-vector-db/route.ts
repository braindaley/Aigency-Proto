import { NextRequest, NextResponse } from 'next/server';
import { VectorService } from '@/lib/vectorService';

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId' },
        { status: 400 }
      );
    }

    console.log(`🚀 Initializing vector database for company: ${companyId}`);
    
    // Process all existing documents and artifacts for this company
    await VectorService.processExistingDocuments(companyId);
    
    return NextResponse.json({
      success: true,
      message: `Successfully initialized vector database for company ${companyId}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error initializing vector database:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize vector database',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check vector database status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const testQuery = searchParams.get('query') || 'workers compensation insurance policy';

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId parameter' },
        { status: 400 }
      );
    }

    console.log(`🔍 Testing vector search for company: ${companyId} with query: "${testQuery}"`);
    
    // Test vector search
    const results = await VectorService.searchSimilar(companyId, testQuery, 5);
    
    return NextResponse.json({
      success: true,
      companyId,
      testQuery,
      resultsCount: results.length,
      results: results.map(chunk => ({
        documentName: chunk.metadata.documentName,
        type: chunk.metadata.type,
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        contentPreview: chunk.content.substring(0, 200) + '...',
        contentLength: chunk.content.length
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing vector search:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test vector search',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}