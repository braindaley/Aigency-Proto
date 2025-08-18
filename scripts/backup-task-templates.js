const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with environment variables
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aigency-proto",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: serviceAccount.projectId,
  });
}

const db = admin.firestore();

async function backupTaskTemplates() {
  console.log('Starting backup of task templates...');
  
  try {
    // Fetch all tasks from Firestore
    const tasksSnapshot = await db.collection('tasks').get();
    
    const tasks = [];
    tasksSnapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data,
        // Convert any Firestore Timestamps to ISO strings for backup
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      });
    });
    
    // Sort tasks by sortOrder for better readability
    tasks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(backupDir, `task-templates-backup-${timestamp}.json`);
    
    // Write backup file
    fs.writeFileSync(filename, JSON.stringify(tasks, null, 2));
    
    console.log(`✅ Backup successful!`);
    console.log(`📁 Saved ${tasks.length} task templates to: ${filename}`);
    
    // Also create a "latest" backup for easy access
    const latestFilename = path.join(backupDir, 'task-templates-latest.json');
    fs.writeFileSync(latestFilename, JSON.stringify(tasks, null, 2));
    console.log(`📁 Also saved as: ${latestFilename}`);
    
    return tasks;
  } catch (error) {
    console.error('❌ Error backing up task templates:', error);
    throw error;
  }
}

// Run the backup
backupTaskTemplates()
  .then(() => {
    console.log('Backup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backup failed:', error);
    process.exit(1);
  });