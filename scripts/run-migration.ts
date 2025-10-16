/**
 * Simple script to trigger document migration via API
 * This is useful for running migrations from the command line
 */

const COMPANY_ID = process.argv[2] || 'qsu1QXPB8TUK2P4QyDiy';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

async function runMigration() {
  console.log(`🚀 Starting document migration for company: ${COMPANY_ID}`);
  console.log(`   API URL: ${API_URL}`);

  try {
    const response = await fetch(`${API_URL}/api/migrate-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: COMPANY_ID,
        forceReprocess: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Total documents:     ${result.stats.total}`);
    console.log(`✅ Processed:        ${result.stats.processed}`);
    console.log(`⏭️  Skipped:          ${result.stats.skipped}`);
    console.log(`❌ Failed:           ${result.stats.failed}`);
    console.log('='.repeat(60));

    if (result.results && result.results.length > 0) {
      console.log('\n📄 DOCUMENT DETAILS:');
      result.results.forEach((doc: any, idx: number) => {
        const statusIcon = doc.status === 'success' ? '✅' : doc.status === 'failed' ? '❌' : '⏭️';
        console.log(`${idx + 1}. ${statusIcon} ${doc.filename}`);
        if (doc.error) {
          console.log(`   Error: ${doc.error}`);
        } else if (doc.contentLength) {
          console.log(`   Extracted: ${doc.contentLength} characters`);
        } else if (doc.reason) {
          console.log(`   Reason: ${doc.reason}`);
        }
      });
    }

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
