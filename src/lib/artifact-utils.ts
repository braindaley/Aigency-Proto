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
  carrierName?: string; // For carrier-specific emails
  artifactIndex?: number; // Position in sequence (1 of 6, 2 of 6, etc.)
  totalArtifacts?: number; // Total number of artifacts in set
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
  databaseId,
  carrierName,
  artifactIndex,
  totalArtifacts
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
      carrierName: carrierName || null,
      artifactIndex: artifactIndex || null,
      totalArtifacts: totalArtifacts || null,
      updatedAt: serverTimestamp()
    };

    const artifactsRef = collection(db, `companies/${companyId}/artifacts`);

    // If this is part of a multi-artifact set (has carrierName or artifactIndex), always create new
    if (carrierName || artifactIndex) {
      const docRef = await addDoc(artifactsRef, {
        ...artifactData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Multi-artifact created in database:', docRef.id, carrierName ? `for ${carrierName}` : `(${artifactIndex} of ${totalArtifacts})`);
      return docRef.id;
    }

    // For single artifacts, check if we should update existing
    const existingQuery = query(
      artifactsRef,
      where('taskId', '==', taskId),
      where('tags', 'array-contains', 'ai-canvas')
    );
    const existingArtifacts = await getDocs(existingQuery);

    // Only update if there's exactly one existing artifact (not a multi-artifact set)
    if (!existingArtifacts.empty && existingArtifacts.size === 1) {
      const existingDoc = existingArtifacts.docs[0];
      const existingData = existingDoc.data();

      // Don't update if existing is part of a multi-artifact set
      if (!existingData.carrierName && !existingData.artifactIndex) {
        await updateDoc(doc(db, `companies/${companyId}/artifacts`, existingDoc.id), artifactData);
        console.log('✅ Artifact updated in database (found by taskId):', existingDoc.id);
        return existingDoc.id;
      }
    }

    // If we have a databaseId and should update
    if (databaseId) {
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

/**
 * Save multiple artifacts from a parsed artifact array
 * Automatically extracts carrier names from titles like "Submission Email - Starr Insurance"
 */
export async function saveMultipleArtifacts({
  companyId,
  taskId,
  taskName,
  artifacts,
  type = 'document',
  description,
  tags = []
}: {
  companyId: string;
  taskId: string;
  taskName: string;
  artifacts: Array<{ id: string; title: string; content: string }>;
  type?: 'document' | 'code' | 'markdown';
  description?: string;
  tags?: string[];
}): Promise<string[]> {
  const savedIds: string[] = [];
  const totalArtifacts = artifacts.length;

  for (let i = 0; i < artifacts.length; i++) {
    const artifact = artifacts[i];

    // Extract carrier name from title if it follows pattern "... - Carrier Name"
    const carrierMatch = artifact.title.match(/(?:Submission Email|Email)\s*-\s*(.+)$/i);
    const carrierName = carrierMatch ? carrierMatch[1].trim() : undefined;

    try {
      const artifactId = await saveArtifactToDatabase({
        companyId,
        taskId,
        taskName,
        title: artifact.title,
        content: artifact.content,
        type,
        description: description || (carrierName ? `Submission email for ${carrierName}` : undefined),
        tags: [...tags, ...(carrierName ? ['carrier-submission'] : [])],
        carrierName,
        artifactIndex: i + 1,
        totalArtifacts
      });

      savedIds.push(artifactId);
    } catch (error) {
      console.error(`Failed to save artifact ${i + 1} (${artifact.title}):`, error);
    }
  }

  console.log(`✅ Saved ${savedIds.length} of ${totalArtifacts} artifacts to database`);
  return savedIds;
}