import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { DocumentProcessingService } from '@/lib/documentProcessingService';

/**
 * API endpoint to migrate/process all existing documents for a company
 * This processes documents that don't have pre-processed text yet
 */
export async function POST(req: NextRequest) {
  try {
    const { companyId, forceReprocess } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing required field: companyId' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting document migration for company: ${companyId}`);

    const documentsRef = collection(db, `companies/${companyId}/documents`);
    const documentsSnapshot = await getDocs(documentsRef);

    if (documentsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No documents found',
        stats: { total: 0, processed: 0, skipped: 0, failed: 0 }
      });
    }

    const stats = {
      total: documentsSnapshot.docs.length,
      processed: 0,
      skipped: 0,
      failed: 0
    };

    const results = [];

    for (const docSnapshot of documentsSnapshot.docs) {
      const docData = docSnapshot.data();
      const docId = docSnapshot.id;

      // Skip if already processed (unless force reprocess is enabled)
      if (!forceReprocess && docData.processingStatus === 'success' && docData.extractedText) {
        console.log(`⏭️  Skipping ${docData.name} - already processed`);
        stats.skipped++;
        results.push({
          documentId: docId,
          filename: docData.name,
          status: 'skipped',
          reason: 'already processed'
        });
        continue;
      }

      // Check if this is a processable document type
      const filename = docData.name.toLowerCase();
      const isProcessable =
        filename.endsWith('.pdf') ||
        filename.endsWith('.xlsx') ||
        filename.endsWith('.xls') ||
        filename.endsWith('.docx') ||
        filename.endsWith('.doc') ||
        docData.type === 'application/pdf' ||
        docData.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        docData.type === 'application/vnd.ms-excel' ||
        docData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        docData.type === 'application/msword';

      if (!isProcessable) {
        console.log(`⏭️  Skipping ${docData.name} - not a processable type`);
        stats.skipped++;
        results.push({
          documentId: docId,
          filename: docData.name,
          status: 'skipped',
          reason: 'not a processable type'
        });
        continue;
      }

      try {
        console.log(`🔄 Processing ${docData.name}...`);

        const result = await DocumentProcessingService.processDocumentFromUrl(
          companyId,
          docId,
          docData.url,
          docData.name,
          docData.type
        );

        if (result.processingStatus === 'success') {
          console.log(`✅ Successfully processed ${docData.name} (${result.contentLength} characters)`);
          stats.processed++;
          results.push({
            documentId: docId,
            filename: docData.name,
            status: 'success',
            contentLength: result.contentLength
          });
        } else {
          console.log(`❌ Failed to process ${docData.name}: ${result.processingError}`);
          stats.failed++;
          results.push({
            documentId: docId,
            filename: docData.name,
            status: 'failed',
            error: result.processingError
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${docData.name}:`, error);
        stats.failed++;
        results.push({
          documentId: docId,
          filename: docData.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Update the document with error status
        try {
          const docRef = doc(db, `companies/${companyId}/documents`, docId);
          await updateDoc(docRef, {
            processingStatus: 'failed',
            processingError: error instanceof Error ? error.message : 'Unknown error',
            processedAt: new Date()
          });
        } catch (updateError) {
          console.error(`Failed to update error status for ${docData.name}:`, updateError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document migration completed',
      stats,
      results
    });
  } catch (error) {
    console.error('Error in migrate-documents API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
