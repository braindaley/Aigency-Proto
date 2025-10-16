/**
 * Migration Script: Process Existing Documents
 *
 * This script processes all existing documents in Firestore that don't have
 * pre-processed text content. It extracts text from PDFs, Excel files, and
 * Word documents and stores the extracted content in Firestore.
 *
 * Usage:
 *   npx tsx scripts/migrate-existing-documents.ts [companyId]
 *
 * If companyId is provided, only processes documents for that company.
 * Otherwise, processes all companies.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { DocumentProcessingService } from '../src/lib/documentProcessingService';

// Firebase config - should match your project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface DocumentData {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  extractedText?: string;
  processingStatus?: string;
}

async function processCompanyDocuments(companyId: string) {
  console.log(`\n📂 Processing documents for company: ${companyId}`);

  const documentsRef = collection(db, `companies/${companyId}/documents`);
  const documentsSnapshot = await getDocs(documentsRef);

  if (documentsSnapshot.empty) {
    console.log(`   No documents found for company ${companyId}`);
    return { total: 0, processed: 0, skipped: 0, failed: 0 };
  }

  console.log(`   Found ${documentsSnapshot.docs.length} documents`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const docSnapshot of documentsSnapshot.docs) {
    const docData = docSnapshot.data() as DocumentData;
    const docId = docSnapshot.id;

    // Skip if already processed
    if (docData.processingStatus === 'success' && docData.extractedText) {
      console.log(`   ⏭️  Skipping ${docData.name} - already processed`);
      skipped++;
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
      console.log(`   ⏭️  Skipping ${docData.name} - not a processable type`);
      skipped++;
      continue;
    }

    try {
      console.log(`   🔄 Processing ${docData.name}...`);

      const result = await DocumentProcessingService.processDocumentFromUrl(
        companyId,
        docId,
        docData.url,
        docData.name,
        docData.type
      );

      if (result.processingStatus === 'success') {
        console.log(`   ✅ Successfully processed ${docData.name} (${result.contentLength} characters)`);
        processed++;
      } else {
        console.log(`   ❌ Failed to process ${docData.name}: ${result.processingError}`);
        failed++;
      }

      // Add a small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error processing ${docData.name}:`, error);
      failed++;

      // Update the document with error status
      try {
        const docRef = doc(db, `companies/${companyId}/documents`, docId);
        await updateDoc(docRef, {
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        });
      } catch (updateError) {
        console.error(`   Failed to update error status for ${docData.name}:`, updateError);
      }
    }
  }

  return {
    total: documentsSnapshot.docs.length,
    processed,
    skipped,
    failed
  };
}

async function getAllCompanies(): Promise<string[]> {
  const companiesRef = collection(db, 'companies');
  const companiesSnapshot = await getDocs(companiesRef);
  return companiesSnapshot.docs.map(doc => doc.id);
}

async function main() {
  const args = process.argv.slice(2);
  const targetCompanyId = args[0];

  console.log('🚀 Starting document migration...\n');

  let companyIds: string[];

  if (targetCompanyId) {
    console.log(`Processing specific company: ${targetCompanyId}`);
    companyIds = [targetCompanyId];
  } else {
    console.log('Processing all companies...');
    companyIds = await getAllCompanies();
    console.log(`Found ${companyIds.length} companies\n`);
  }

  let totalStats = {
    total: 0,
    processed: 0,
    skipped: 0,
    failed: 0
  };

  for (const companyId of companyIds) {
    const stats = await processCompanyDocuments(companyId);
    totalStats.total += stats.total;
    totalStats.processed += stats.processed;
    totalStats.skipped += stats.skipped;
    totalStats.failed += stats.failed;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total documents:     ${totalStats.total}`);
  console.log(`✅ Processed:        ${totalStats.processed}`);
  console.log(`⏭️  Skipped:          ${totalStats.skipped}`);
  console.log(`❌ Failed:           ${totalStats.failed}`);
  console.log('='.repeat(60));

  if (totalStats.failed > 0) {
    console.log('\n⚠️  Some documents failed to process. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  }
}

// Run the migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
