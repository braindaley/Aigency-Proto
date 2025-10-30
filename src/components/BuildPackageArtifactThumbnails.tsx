'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface ArtifactThumbnail {
  taskId: string;
  taskName: string;
}

interface BuildPackageArtifactThumbnailsProps {
  taskIds: string[];
  companyId: string;
  onSelectArtifact?: (taskId: string) => void;
}

export function BuildPackageArtifactThumbnails({
  taskIds,
  companyId,
  onSelectArtifact
}: BuildPackageArtifactThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<ArtifactThumbnail[]>([]);

  useEffect(() => {
    loadThumbnails();
  }, [taskIds, companyId]);

  const loadThumbnails = async () => {
    if (!taskIds || taskIds.length === 0) return;

    const loadedThumbnails: ArtifactThumbnail[] = [];

    try {
      for (const taskId of taskIds) {
        if (!taskId) continue;

        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const artifactsSnapshot = await getDocs(artifactsRef);

        const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.taskId === taskId;
        });

        if (taskArtifacts.length > 0) {
          const artifactData = taskArtifacts[0].data();
          const taskName = artifactData.taskName || 'Document';

          // Only show thumbnails for ACORD 130, ACORD 125, and narrative
          const shouldShow = taskName.toLowerCase().includes('acord 130') ||
                           taskName.toLowerCase().includes('acord 125') ||
                           taskName.toLowerCase().includes('narrative');

          if (shouldShow) {
            loadedThumbnails.push({
              taskId,
              taskName: taskName,
            });
          }
        }
      }

      setThumbnails(loadedThumbnails);
    } catch (error) {
      console.error('Error loading thumbnails:', error);
    }
  };

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Generated Documents:</h4>
      <div className="space-y-2">
        {thumbnails.map((thumbnail) => (
          <button
            key={thumbnail.taskId}
            onClick={() => onSelectArtifact?.(thumbnail.taskId)}
            className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted transition-colors w-full text-left"
          >
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium">{thumbnail.taskName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
