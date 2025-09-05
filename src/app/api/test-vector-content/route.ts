import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || '9TqeywGbUh5nHSmYpzYe';
    const searchTerm = searchParams.get('search') || 'contact';
    
    console.log(`Testing vector content for company: ${companyId}, searching for: ${searchTerm}`);
    
    // Get all vectors for the company
    const vectorsCollection = collection(db, `companies/${companyId}/vectors`);
    const vectorQuery = query(vectorsCollection, limit(100));
    const snapshot = await getDocs(vectorQuery);
    
    const results: any[] = [];
    let foundContactInfo = false;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const content = data.content || '';
      const lowerContent = content.toLowerCase();
      
      // Check if this chunk contains what we're looking for
      if (lowerContent.includes(searchTerm.toLowerCase()) || 
          lowerContent.includes('phone') || 
          lowerContent.includes('email') ||
          lowerContent.includes('contact') ||
          lowerContent.includes('555') ||
          lowerContent.includes('brian') ||
          lowerContent.includes('daley')) {
        
        foundContactInfo = true;
        results.push({
          id: doc.id,
          documentName: data.metadata?.documentName || 'Unknown',
          type: data.metadata?.type || 'Unknown',
          chunkIndex: data.metadata?.chunkIndex || 0,
          totalChunks: data.metadata?.totalChunks || 0,
          contentLength: content.length,
          contentPreview: content.substring(0, 500),
          hasPhoneNumber: /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(content),
          hasEmail: /[\w.-]+@[\w.-]+\.\w+/.test(content),
          matchedTerms: {
            phone: lowerContent.includes('phone'),
            email: lowerContent.includes('email'),
            contact: lowerContent.includes('contact'),
            '555': lowerContent.includes('555'),
            brian: lowerContent.includes('brian'),
            daley: lowerContent.includes('daley')
          }
        });
      }
    });
    
    // Also check what PDF documents we have
    const pdfChunks = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.metadata?.type === 'application/pdf';
    }).map(doc => {
      const data = doc.data();
      return {
        documentName: data.metadata?.documentName,
        chunkIndex: data.metadata?.chunkIndex,
        totalChunks: data.metadata?.totalChunks,
        contentPreview: (data.content || '').substring(0, 200)
      };
    });
    
    return NextResponse.json({
      success: true,
      totalVectors: snapshot.size,
      searchTerm,
      foundContactInfo,
      matchingChunks: results.length,
      results: results.slice(0, 10), // Limit to first 10 matches
      pdfDocuments: [...new Set(pdfChunks.map(p => p.documentName))],
      samplePdfChunks: pdfChunks.slice(0, 5),
      debugInfo: {
        message: 'This endpoint helps debug what content is actually stored in the vector database',
        totalChunksSearched: snapshot.size,
        pdfChunksFound: pdfChunks.length
      }
    });
    
  } catch (error) {
    console.error('Error testing vector content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test vector content',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}