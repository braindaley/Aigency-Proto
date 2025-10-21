const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}
const db = admin.firestore();

async function checkCompanyArtifacts() {
  const companyId = 'hkDZmFfhLVy7cAqxdfsz';

  try {
    // Check the artifacts collection for this company
    const artifactsSnapshot = await db.collection('artifacts')
      .where('companyId', '==', companyId)
      .get();

    console.log(`\n=== ARTIFACTS FOR COMPANY ${companyId} ===\n`);
    console.log(`Total artifacts found: ${artifactsSnapshot.size}`);

    if (!artifactsSnapshot.empty) {
      console.log('\nArtifact Details:');
      artifactsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. ${data.name || 'Unnamed'}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Type: ${data.type}`);
        console.log(`   Task ID: ${data.taskId}`);
        console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : 'Unknown'}`);
        console.log(`   Tags: ${data.tags ? data.tags.join(', ') : 'None'}`);
      });
    } else {
      console.log('\n✅ NO ARTIFACTS FOUND - The company has ZERO artifacts in Firebase');
    }

    // Also check the documents collection (which sometimes contains artifacts)
    const docsSnapshot = await db.collection('documents')
      .where('companyId', '==', companyId)
      .where('type', '==', 'text')
      .get();

    console.log(`\n=== DOCUMENT ARTIFACTS (type: text) ===`);
    console.log(`Total found: ${docsSnapshot.size}`);

    if (!docsSnapshot.empty) {
      console.log('\nDocument Details:');
      docsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. ${data.name || data.filename || 'Unnamed'}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Tags: ${data.tags ? data.tags.join(', ') : 'None'}`);
        if (data.tags && data.tags.includes('ai-generated')) {
          console.log(`   ⚠️ This is an AI-generated artifact`);
        }
      });
    }

  } catch (error) {
    console.error('Error checking artifacts:', error);
  }
}

checkCompanyArtifacts().then(() => process.exit(0)).catch(console.error);