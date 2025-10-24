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

    const taskIds: string[] = [];
    for (const taskSnapshot of tasksSnapshot.docs) {
      taskIds.push(taskSnapshot.id);
      await deleteDoc(doc(db, 'companyTasks', taskSnapshot.id));
    }

    // 2a. Delete task chats for all deleted tasks
    let chatMessagesDeleted = 0;
    for (const taskId of taskIds) {
      try {
        const messagesRef = collection(db, 'taskChats', taskId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);

        for (const messageDoc of messagesSnapshot.docs) {
          await deleteDoc(doc(db, 'taskChats', taskId, 'messages', messageDoc.id));
          chatMessagesDeleted++;
        }

        // Delete the taskChats document itself
        await deleteDoc(doc(db, 'taskChats', taskId));
      } catch (error) {
        // Task chat might not exist, continue
        console.log(`No chat found for task ${taskId}`);
      }
    }
    console.log(`Deleted ${taskIds.length} task chat collections with ${chatMessagesDeleted} messages`);

    // 2b. Delete AI task jobs for deleted tasks
    // Note: Can't use 'in' query with 48+ taskIds (Firestore limit is 10)
    // Instead, query by companyId which is more efficient
    const aiJobsRef = collection(db, 'aiTaskJobs');
    const aiJobsQuery = query(aiJobsRef, where('companyId', '==', companyId));
    try {
      const aiJobsSnapshot = await getDocs(aiJobsQuery);
      for (const jobDoc of aiJobsSnapshot.docs) {
        await deleteDoc(doc(db, 'aiTaskJobs', jobDoc.id));
      }
      console.log(`Deleted ${aiJobsSnapshot.size} AI task jobs`);
    } catch (error) {
      console.log('No AI jobs to delete or error deleting them');
    }

    // 3. Delete all submissions in the submissions subcollection
    try {
      const submissionsRef = collection(db, `companies/${companyId}/submissions`);
      const submissionsSnapshot = await getDocs(submissionsRef);
      console.log(`Found ${submissionsSnapshot.size} submissions to delete`);

      for (const submissionDoc of submissionsSnapshot.docs) {
        await deleteDoc(doc(db, `companies/${companyId}/submissions`, submissionDoc.id));
      }
    } catch (error) {
      console.log('No submissions to delete or error deleting them');
    }

    // 4. Delete all vectors in the vectors subcollection
    try {
      const vectorsRef = collection(db, `companies/${companyId}/vectors`);
      const vectorsSnapshot = await getDocs(vectorsRef);
      console.log(`Found ${vectorsSnapshot.size} vectors to delete`);

      for (const vectorDoc of vectorsSnapshot.docs) {
        await deleteDoc(doc(db, `companies/${companyId}/vectors`, vectorDoc.id));
      }
    } catch (error) {
      console.log('No vectors to delete or error deleting them');
    }

    // 6. Delete all artifacts in the artifacts subcollection
    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
    const artifactsSnapshot = await getDocs(artifactsRef);
    console.log(`Found ${artifactsSnapshot.size} artifacts to delete`);

    for (const artifactSnapshot of artifactsSnapshot.docs) {
      await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactSnapshot.id));
    }

    // 7. Delete all conversations in the conversations subcollection
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

    // 8. Delete all files in Firebase Storage
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

    // 9. Finally, delete the company document itself
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
