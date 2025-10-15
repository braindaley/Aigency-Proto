import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SaveArtifactParams {
  companyId: string;
  taskId: string;
  taskName: string;
  title: string;
  content: string;
  type?: 'document' | 'code' | 'markdown';
  description?: string;
  tags?: string[];
  databaseId?: string; // For updates
}

export async function saveArtifactToDatabase({
  companyId,
  taskId,
  taskName,
  title,
  content,
  type = 'document',
  description,
  tags = [],
  databaseId
}: SaveArtifactParams): Promise<string> {
  try {
    const artifactData = {
      name: title,
      type: type === 'document' ? 'text' : type,
      data: content,
      description: description || `AI canvas artifact from task: ${taskName}`,
      taskId,
      taskName,
      tags: [...tags, 'ai-canvas', 'ai-generated', 'auto-saved'],
      renewalType: null,
      updatedAt: serverTimestamp()
    };

    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);

    // First, try to find existing artifact by taskId and ai-canvas tag
    const existingQuery = query(
      artifactsRef,
      where('taskId', '==', taskId),
      where('tags', 'array-contains', 'ai-canvas')
    );
    const existingArtifacts = await getDocs(existingQuery);

    if (!existingArtifacts.empty) {
      // Update the first matching artifact (should only be one per task)
      const existingDoc = existingArtifacts.docs[0];
      await updateDoc(doc(db, `companies/${companyId}/artifacts`, existingDoc.id), artifactData);
      console.log('✅ Artifact updated in database (found by taskId):', existingDoc.id);
      return existingDoc.id;
    } else if (databaseId) {
      // Try to update using the provided databaseId
      try {
        const artifactRef = doc(db, `companies/${companyId}/artifacts`, databaseId);
        await updateDoc(artifactRef, artifactData);
        console.log('✅ Artifact updated in database (using databaseId):', databaseId);
        return databaseId;
      } catch (error) {
        // If update fails (document doesn't exist), create a new one
        console.warn('⚠️ Failed to update artifact (document may have been deleted), creating new one:', error);
        const docRef = await addDoc(artifactsRef, {
          ...artifactData,
          createdAt: serverTimestamp()
        });
        console.log('✅ New artifact created in database:', docRef.id);
        return docRef.id;
      }
    } else {
      // Create new artifact
      const docRef = await addDoc(artifactsRef, {
        ...artifactData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Artifact created in database:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('❌ Error saving artifact to database:', error);
    throw error;
  }
}

export function extractArtifactFromContent(content: string): { content: string; title?: string } | null {
  const artifactMatch = content.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/);
  if (!artifactMatch) return null;
  
  const artifactContent = artifactMatch[1].trim();
  
  // Try to extract title from first heading
  const titleMatch = artifactContent.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  
  return {
    content: artifactContent,
    title
  };
}