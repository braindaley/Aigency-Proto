import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { taskId, companyId } = await request.json();

    if (!taskId || !companyId) {
      return NextResponse.json(
        { error: 'Missing taskId or companyId' },
        { status: 400 }
      );
    }

    console.log(`🧹 Cleaning task ${taskId}...`);

    // Delete all artifacts for this task
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsQuery = query(artifactsRef, where('taskId', '==', taskId));
    const artifactsSnapshot = await getDocs(artifactsQuery);

    console.log(`   Found ${artifactsSnapshot.size} artifacts to delete`);

    for (const artifactDoc of artifactsSnapshot.docs) {
      await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactDoc.id));
    }

    // Delete all chat messages for this task
    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    const chatSnapshot = await getDocs(chatRef);

    console.log(`   Found ${chatSnapshot.size} messages to delete`);

    for (const msgDoc of chatSnapshot.docs) {
      await deleteDoc(doc(db, 'taskChats', taskId, 'messages', msgDoc.id));
    }

    // Reset task status to pending
    const taskRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskRef, {
      status: 'pending',
      updatedAt: new Date()
    });

    console.log('✅ Task cleaned successfully');

    return NextResponse.json({
      success: true,
      deletedArtifacts: artifactsSnapshot.size,
      deletedMessages: chatSnapshot.size
    });

  } catch (error) {
    console.error('Error cleaning task:', error);
    return NextResponse.json(
      { error: 'Failed to clean task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
