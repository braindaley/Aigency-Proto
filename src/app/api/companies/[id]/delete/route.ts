import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import {
  doc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    console.log(`Starting deletion of company: ${companyId}`);

    // 1. Delete all documents in the documents subcollection
    const documentsRef = collection(db, `companies/${companyId}/documents`);
    const documentsSnapshot = await getDocs(documentsRef);
    console.log(`Found ${documentsSnapshot.size} documents to delete`);

    for (const docSnapshot of documentsSnapshot.docs) {
      await deleteDoc(doc(db, `companies/${companyId}/documents`, docSnapshot.id));
    }

    // 2. Delete all tasks for this company from the companyTasks collection
    const tasksRef = collection(db, 'companyTasks');
    const tasksQuery = query(tasksRef, where('companyId', '==', companyId));
    const tasksSnapshot = await getDocs(tasksQuery);
    console.log(`Found ${tasksSnapshot.size} tasks to delete`);

    for (const taskSnapshot of tasksSnapshot.docs) {
      await deleteDoc(doc(db, 'companyTasks', taskSnapshot.id));
    }

    // 3. Delete all artifacts in the artifacts subcollection
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsSnapshot = await getDocs(artifactsRef);
    console.log(`Found ${artifactsSnapshot.size} artifacts to delete`);

    for (const artifactSnapshot of artifactsSnapshot.docs) {
      await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactSnapshot.id));
    }

    // 4. Delete all conversations in the conversations subcollection
    const conversationsRef = collection(db, `companies/${companyId}/conversations`);
    const conversationsSnapshot = await getDocs(conversationsRef);
    console.log(`Found ${conversationsSnapshot.size} conversations to delete`);

    for (const conversationSnapshot of conversationsSnapshot.docs) {
      // Delete messages in each conversation
      const messagesRef = collection(db, `companies/${companyId}/conversations/${conversationSnapshot.id}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);

      for (const messageSnapshot of messagesSnapshot.docs) {
        await deleteDoc(doc(db, `companies/${companyId}/conversations/${conversationSnapshot.id}/messages`, messageSnapshot.id));
      }

      // Delete the conversation itself
      await deleteDoc(doc(db, `companies/${companyId}/conversations`, conversationSnapshot.id));
    }

    // 5. Delete all files in Firebase Storage
    try {
      const storageRef = ref(storage, `companies/${companyId}`);
      const storageList = await listAll(storageRef);

      console.log(`Found ${storageList.items.length} storage items to delete`);

      // Delete all files
      for (const item of storageList.items) {
        await deleteObject(item);
      }

      // Recursively delete all folders
      for (const prefix of storageList.prefixes) {
        await deleteStorageFolder(prefix);
      }
    } catch (storageError) {
      console.error('Error deleting storage files:', storageError);
      // Continue with deletion even if storage fails
    }

    // 6. Finally, delete the company document itself
    await deleteDoc(doc(db, 'companies', companyId));

    console.log(`Successfully deleted company: ${companyId}`);

    return NextResponse.json({
      success: true,
      message: 'Company and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to recursively delete storage folders
async function deleteStorageFolder(folderRef: any) {
  const folderList = await listAll(folderRef);

  // Delete all files in this folder
  for (const item of folderList.items) {
    await deleteObject(item);
  }

  // Recursively delete all subfolders
  for (const prefix of folderList.prefixes) {
    await deleteStorageFolder(prefix);
  }
}
