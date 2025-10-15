// Test script to see what Excel content is being passed to AI
const { DataService } = require('./src/lib/data-service.ts');

async function testExcelContent() {
  console.log('Testing Excel content extraction...\n');

  const context = await DataService.getEnhancedAITaskContext(
    'B2JRUCeZuzLZFoUHIDPv',
    'lygPPyA0JiRBVG5dMVWU'
  );

  console.log(`Total artifacts: ${context.allArtifacts.length}\n`);

  // Find Excel-related artifacts
  const excelArtifacts = context.allArtifacts.filter(a =>
    a.filename && (a.filename.includes('.xlsx') || a.filename.includes('.xls'))
  );

  console.log(`Excel artifacts found: ${excelArtifacts.length}\n`);

  excelArtifacts.forEach((artifact, i) => {
    console.log(`\n=== EXCEL ARTIFACT ${i + 1} ===`);
    console.log(`Filename: ${artifact.filename}`);
    console.log(`Task: ${artifact.taskName}`);
    console.log(`Content length: ${artifact.content?.length || 0} characters`);
    console.log(`Content preview (first 500 chars):\n${artifact.content?.substring(0, 500)}\n`);
  });
}

testExcelContent().catch(console.error);
