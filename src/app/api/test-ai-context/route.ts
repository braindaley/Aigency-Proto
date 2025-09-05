import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';
import { getCompanyContact } from '@/lib/companyContactData';
import { VectorService } from '@/lib/vectorService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || '9TqeywGbUh5nHSmYpzYe';
    const testQuery = searchParams.get('query') || 'contact information phone email';
    
    console.log(`Testing AI context for company: ${companyId}`);
    
    // 1. Get the contact data override
    const contactData = getCompanyContact(companyId);
    
    // 2. Get vector search results
    const vectorResults = await VectorService.searchSimilar(companyId, testQuery, 5);
    
    // 3. Get the full enhanced AI context (this is what the AI actually sees)
    const aiContextResult = await DataService.getEnhancedAITaskContext(companyId);
    const aiContext = aiContextResult.relevantContent;
    
    // 4. Analyze what contact info is present
    const contextAnalysis = {
      hasContactOverride: !!contactData,
      contactDataFound: contactData || 'No override data configured',
      
      // Check if AI context contains contact info
      aiContextContainsPhone: aiContext ? aiContext.toLowerCase().includes('phone') : false,
      aiContextContains555: aiContext ? aiContext.includes('555') : false,
      aiContextContainsBrian: aiContext ? aiContext.toLowerCase().includes('brian') : false,
      aiContextContainsEmail: aiContext ? aiContext.includes('@') : false,
      
      // Extract any phone numbers found in context
      phoneNumbersInContext: aiContext ? (aiContext.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/g) || []) : [],
      emailsInContext: aiContext ? (aiContext.match(/[\w.-]+@[\w.-]+\.\w+/g) || []) : [],
      
      // Vector search analysis
      vectorResultsCount: vectorResults.length,
      vectorResultsSummary: vectorResults.map(chunk => ({
        document: chunk.metadata.documentName,
        hasPhone: /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(chunk.content),
        hasEmail: /[\w.-]+@[\w.-]+\.\w+/.test(chunk.content),
        contentSnippet: chunk.content.substring(0, 100)
      }))
    };
    
    // 5. Test what the AI would see for a specific task
    const sampleTaskContextResult = await DataService.getEnhancedAITaskContext(companyId);
    const sampleTaskContext = sampleTaskContextResult.relevantContent;
    
    return NextResponse.json({
      success: true,
      companyId,
      testQuery,
      
      // What we found
      contactDataOverride: contactData,
      contextAnalysis,
      
      // The actual AI context (truncated for display)
      aiContextPreview: aiContext ? {
        fullLength: aiContext.length,
        first1000Chars: aiContext.substring(0, 1000),
        last1000Chars: aiContext.substring(Math.max(0, aiContext.length - 1000))
      } : { message: 'No AI context available' },
      
      // Sample task test
      sampleTaskTest: sampleTaskContext ? {
        task: "Provide company contact information",
        contextLength: sampleTaskContext.length,
        containsContactSection: sampleTaskContext.includes('=== COMPANY CONTACT INFORMATION ==='),
        containsPhone: sampleTaskContext.includes('Phone:'),
        containsEmail: sampleTaskContext.includes('Email:')
      } : { message: 'No sample task context available' },
      
      // Debug info
      debug: {
        message: 'This endpoint shows exactly what the AI sees when processing tasks',
        checkpoints: {
          contactOverrideConfigured: !!contactData,
          vectorDatabaseHasContent: vectorResults.length > 0,
          aiContextIncludesContactInfo: sampleTaskContext ? sampleTaskContext.includes('COMPANY CONTACT INFORMATION') : false
        }
      }
    });
    
  } catch (error) {
    console.error('Error testing AI context:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test AI context',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}