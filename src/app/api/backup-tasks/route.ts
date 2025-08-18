import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    // Fetch all tasks from Firestore
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    
    const tasks: any[] = [];
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
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `task-templates-backup-${timestamp}.json`;
    
    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(tasks, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error backing up task templates:', error);
    return NextResponse.json(
      { error: 'Failed to backup task templates' },
      { status: 500 }
    );
  }
}