'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, FileText, Eye, Download } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Skeleton } from '@/components/ui/skeleton';

interface DependencyArtifact {
  taskId: string;
  taskName: string;
  taskPhase: string;
  taskStatus: string;
  content: string;
  timestamp?: Date;
}

interface DependencyArtifactsReviewProps {
  task: CompanyTask;
  companyId: string;
}

export function DependencyArtifactsReview({ task, companyId }: DependencyArtifactsReviewProps) {
  const [artifacts, setArtifacts] = useState<DependencyArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<DependencyArtifact | null>(null);

  useEffect(() => {
    loadDependencyArtifacts();
  }, [task.id, companyId]);

  const loadDependencyArtifacts = async () => {
    if (!task.dependencies || task.dependencies.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const loadedArtifacts: DependencyArtifact[] = [];

    try {
      // Load each dependency task
      for (const depId of task.dependencies) {
        try {
          // Try to find the task by templateId in companyTasks
          const tasksRef = collection(db, 'companyTasks');
          const tasksSnapshot = await getDocs(tasksRef);

          const matchingTask = tasksSnapshot.docs.find(taskDoc => {
            const taskData = taskDoc.data();
            return (taskData.templateId === depId || String(taskData.templateId) === depId) &&
                   taskData.companyId === companyId;
          });

          if (matchingTask) {
            const depTask = { id: matchingTask.id, ...matchingTask.data() } as CompanyTask;

            let artifactContent = '';
            let artifactTimestamp: Date | undefined;

            // First, try to get artifact from the artifacts collection
            const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
            const artifactsSnapshot = await getDocs(artifactsRef);

            const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
              const data = doc.data();
              return data.taskId === matchingTask.id;
            });

            if (taskArtifacts.length > 0) {
              // Use the first artifact found
              const artifactData = taskArtifacts[0].data();
              artifactContent = artifactData.data || '';
              artifactTimestamp = artifactData.updatedAt?.toDate?.() || artifactData.createdAt?.toDate?.();
            } else {
              // Fallback: try to extract from chat messages (for legacy artifacts)
              const chatRef = collection(db, 'taskChats', matchingTask.id, 'messages');
              const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
              const chatSnapshot = await getDocs(chatQuery);

              if (!chatSnapshot.empty) {
                const messages = chatSnapshot.docs.map(doc => doc.data());
                const fullContent = messages.map(m => m.content).join('\n');
                const artifactMatch = fullContent.match(/<artifact>([\s\S]*?)<\/artifact>/);

                if (artifactMatch && artifactMatch[1]) {
                  artifactContent = artifactMatch[1].trim();
                  artifactTimestamp = messages[messages.length - 1]?.timestamp?.toDate();
                }
              }
            }

            // Add to loaded artifacts if content was found
            if (artifactContent) {
              loadedArtifacts.push({
                taskId: matchingTask.id,
                taskName: depTask.taskName,
                taskPhase: depTask.phase,
                taskStatus: depTask.status,
                content: artifactContent,
                timestamp: artifactTimestamp
              });
            }
          }
        } catch (error) {
          console.error(`Error loading dependency ${depId}:`, error);
        }
      }

      setArtifacts(loadedArtifacts);
    } catch (error) {
      console.error('Error loading dependency artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedArtifact(expandedArtifact === taskId ? null : taskId);
  };

  const viewFullArtifact = (artifact: DependencyArtifact) => {
    setViewingArtifact(artifact);
  };

  const closeFullView = () => {
    setViewingArtifact(null);
  };

  const downloadArtifact = (artifact: DependencyArtifact) => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.taskName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Required Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Required Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No artifacts available from dependency tasks. Complete the required tasks first.
          </p>
        </CardContent>
      </Card>
    );
  }

  // If viewing full artifact
  if (viewingArtifact) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {viewingArtifact.taskName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{viewingArtifact.taskPhase}</Badge>
                <Badge variant={viewingArtifact.taskStatus === 'completed' ? 'default' : 'outline'}>
                  {viewingArtifact.taskStatus}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => downloadArtifact(viewingArtifact)}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={closeFullView} variant="outline" size="sm">
                Back to List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="prose prose-base max-w-none
                            prose-headings:text-foreground prose-headings:font-semibold
                            prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6
                            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-semibold
                            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold
                            prose-p:text-foreground prose-p:leading-7 prose-p:mb-4
                            prose-strong:text-foreground prose-strong:font-semibold
                            prose-ul:my-4 prose-ul:pl-6 prose-ul:text-foreground
                            prose-ol:my-4 prose-ol:pl-6 prose-ol:text-foreground
                            prose-li:mb-2 prose-li:text-foreground prose-li:leading-relaxed
                            prose-blockquote:border-l-4 prose-blockquote:border-l-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic
                            prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-foreground
                            [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {viewingArtifact.content}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Review Required Documents ({artifacts.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Review the following documents from previous tasks before finalizing the submission package.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {artifacts.map((artifact) => (
            <div key={artifact.taskId} className="border border-border rounded-lg">
              <div
                onClick={() => toggleExpand(artifact.taskId)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {expandedArtifact === artifact.taskId ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{artifact.taskName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{artifact.taskPhase}</Badge>
                      <Badge
                        variant={artifact.taskStatus === 'completed' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {artifact.taskStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      viewFullArtifact(artifact);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadArtifact(artifact);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expandedArtifact === artifact.taskId && (
                <div className="px-4 pb-4 pt-2 border-t border-border">
                  <ScrollArea className="h-[300px]">
                    <div className="prose prose-sm max-w-none
                                    prose-headings:text-foreground
                                    prose-p:text-foreground prose-p:leading-relaxed
                                    prose-strong:text-foreground
                                    prose-ul:text-foreground prose-ol:text-foreground
                                    prose-li:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {artifact.content.length > 2000
                          ? artifact.content.substring(0, 2000) + '\n\n*[Content truncated - click "View Full" to see complete document]*'
                          : artifact.content}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
