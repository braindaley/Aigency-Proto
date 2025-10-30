'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Skeleton } from '@/components/ui/skeleton';

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'class', 'style']
  }
};

interface Artifact {
  taskId: string;
  taskName: string;
  content: string;
  timestamp?: Date;
}

interface BuildPackageArtifactsProps {
  taskIds: string[];
  companyId: string;
}

export function BuildPackageArtifacts({ taskIds, companyId }: BuildPackageArtifactsProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  useEffect(() => {
    loadArtifacts();
  }, [taskIds, companyId]);

  const loadArtifacts = async () => {
    if (!taskIds || taskIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const loadedArtifacts: Artifact[] = [];

    try {
      for (const taskId of taskIds) {
        if (!taskId) continue;

        // Try to get artifact from the artifacts collection
        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const artifactsSnapshot = await getDocs(artifactsRef);

        const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.taskId === taskId;
        });

        if (taskArtifacts.length > 0) {
          const artifactData = taskArtifacts[0].data();
          const artifactContent = artifactData.data || '';
          const artifactTimestamp = artifactData.updatedAt?.toDate?.() || artifactData.createdAt?.toDate?.();
          const taskName = artifactData.taskName || 'Document';

          // Only show preview for ACORD 130, ACORD 125, and narrative
          const shouldShowPreview = taskName.toLowerCase().includes('acord 130') ||
                                   taskName.toLowerCase().includes('acord 125') ||
                                   taskName.toLowerCase().includes('narrative');

          if (shouldShowPreview) {
            loadedArtifacts.push({
              taskId,
              taskName: taskName,
              content: artifactContent,
              timestamp: artifactTimestamp,
            });
          }
        } else {
          // Fallback: try to extract from chat messages
          const chatRef = collection(db, 'taskChats', taskId, 'messages');
          const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
          const chatSnapshot = await getDocs(chatQuery);

          if (!chatSnapshot.empty) {
            const messages = chatSnapshot.docs.map(doc => doc.data());
            const fullContent = messages.map(m => m.content).join('\n');
            const artifactMatch = fullContent.match(/<artifact>([\s\S]*?)<\/artifact>/);

            if (artifactMatch && artifactMatch[1]) {
              const artifactContent = artifactMatch[1].trim();
              const artifactTimestamp = messages[messages.length - 1]?.timestamp?.toDate();

              // Only show preview for ACORD 130, ACORD 125, and narrative
              // Since we don't have taskName from chat, we'll check if content suggests it's one of these
              loadedArtifacts.push({
                taskId,
                taskName: 'Document',
                content: artifactContent,
                timestamp: artifactTimestamp,
              });
            }
          }
        }
      }

      setArtifacts(loadedArtifacts);
      if (loadedArtifacts.length > 0 && !selectedArtifact) {
        setSelectedArtifact(loadedArtifacts[0]);
      }
    } catch (error) {
      console.error('Error loading artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.taskName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (artifacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Documents will appear here as they are generated.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Artifact Viewer */}
      {selectedArtifact && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-end">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="source">
                    <FileText className="h-4 w-4 mr-2" />
                    Source
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {viewMode === 'preview' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                  >
                    {selectedArtifact.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                  {selectedArtifact.content}
                </pre>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
