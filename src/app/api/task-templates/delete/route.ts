import { NextRequest, NextResponse } from 'next/server';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';

export async function POST(request: NextRequest) {
  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing templateId' },
        { status: 400 }
      );
    }

    // Delete the template from Firebase
    const taskRef = doc(db, 'tasks', templateId);
    await deleteDoc(taskRef);

    console.log(`✅ Template ${templateId} deleted from Firebase`);

    // Clear template cache
    DataService.clearTemplateCache();

    return NextResponse.json({
      success: true,
      message: `Template ${templateId} successfully deleted`,
      templateId
    });

  } catch (error) {
    console.error('Error deleting task template:', error);
    return NextResponse.json(
      { error: 'Failed to delete task template' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Task template delete endpoint - use POST to delete templates' });
}
