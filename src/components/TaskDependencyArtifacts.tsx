'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Eye } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskChat } from '@/components/TaskChat';

interface DependencyArtifact {
  taskId: string;
  taskName: string;
  taskPhase: string;
  taskStatus: string;
  content: string;
  timestamp?: Date;
}

interface TaskDependencyArtifactsProps {
  task: CompanyTask;
  companyId: string;
  onTaskUpdate: () => void;
}

export function TaskDependencyArtifacts({ task, companyId, onTaskUpdate }: TaskDependencyArtifactsProps) {
  const [artifacts, setArtifacts] = useState<DependencyArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<DependencyArtifact | null>(null);

  useEffect(() => {
    loadDependencyArtifacts();
  }, [task.id, companyId]);

  const loadDependencyArtifacts = async () => {
    setLoading(true);
    const loadedArtifacts: DependencyArtifact[] = [];

    try {
      // Get all artifacts for this company
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const artifactsSnapshot = await getDocs(artifactsRef);

      // FIRST: Load the current task's own artifact
      const currentTaskArtifacts = artifactsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.taskId === task.id;
      });

      if (currentTaskArtifacts.length > 0) {
        const artifactData = currentTaskArtifacts[0].data();
        loadedArtifacts.push({
          taskId: task.id,
          taskName: task.taskName,
          taskPhase: task.phase,
          taskStatus: task.status,
          content: artifactData.data || '',
          timestamp: artifactData.updatedAt?.toDate?.() || artifactData.createdAt?.toDate?.()
        });
      }

      // SECOND: Load dependency task artifacts (ONLY if showDependencyArtifacts is true)
      if (task.showDependencyArtifacts && task.dependencies && task.dependencies.length > 0) {
        const tasksRef = collection(db, 'companyTasks');
        const tasksSnapshot = await getDocs(tasksRef);

        for (const depId of task.dependencies) {
          try {
            // Find the task by templateId
            const matchingTask = tasksSnapshot.docs.find(taskDoc => {
              const taskData = taskDoc.data();
              return (taskData.templateId === depId || String(taskData.templateId) === depId) &&
                     taskData.companyId === companyId;
            });

            if (matchingTask) {
              const depTask = { id: matchingTask.id, ...matchingTask.data() } as CompanyTask;

              // Find artifacts for this dependency task
              const taskArtifacts = artifactsSnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.taskId === matchingTask.id;
              });

              if (taskArtifacts.length > 0) {
                const artifactData = taskArtifacts[0].data();
                loadedArtifacts.push({
                  taskId: matchingTask.id,
                  taskName: depTask.taskName,
                  taskPhase: depTask.phase,
                  taskStatus: depTask.status,
                  content: artifactData.data || '',
                  timestamp: artifactData.updatedAt?.toDate?.() || artifactData.createdAt?.toDate?.()
                });
              }
            }
          } catch (error) {
            console.error(`Error loading dependency ${depId}:`, error);
          }
        }
      }

      setArtifacts(loadedArtifacts);
      // Auto-select first artifact (current task's artifact) if available
      if (loadedArtifacts.length > 0) {
        setSelectedArtifact(loadedArtifacts[0]);
      }
    } catch (error) {
      console.error('Error loading artifacts:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="flex gap-6 h-[calc(100vh-200px)] bg-background">
        <div className="w-1/2 flex flex-col">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="w-1/2">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] bg-background">
      {/* Left Side: Chat with Inline Artifacts List */}
      <div className="w-1/2 flex flex-col">
        {/* Chat Component - includes messages and artifacts inline, input at bottom */}
        <TaskChat
          task={task}
          companyId={companyId}
          onTaskUpdate={onTaskUpdate}
          inlineContent={
            artifacts.length > 0 ? (
              <div className="space-y-2">
                {artifacts.map((artifact, index) => {
                  const isCurrentTask = artifact.taskId === task.id;
                  return (
                    <div
                      key={artifact.taskId}
                      onClick={() => setSelectedArtifact(artifact)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedArtifact?.taskId === artifact.taskId
                          ? 'bg-muted border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <div className="font-medium truncate">{artifact.taskName}</div>
                          </div>
                          {!isCurrentTask && (
                            <div className="flex items-center gap-2 mt-1 ml-6">
                              <Badge variant="outline" className="text-xs">{artifact.taskPhase}</Badge>
                              <Badge
                                variant={artifact.taskStatus === 'completed' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {artifact.taskStatus}
                              </Badge>
                            </div>
                          )}
                        </div>
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
                  );
                })}
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Right Side: Artifact Viewer */}
      <div className="w-1/2">
        {selectedArtifact ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                {selectedArtifact.taskId === task.id ? (
                  // Current task artifact - no header needed (task name is in page header)
                  <Button
                    onClick={() => downloadArtifact(selectedArtifact)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                ) : (
                  // Dependency artifact - show task name for context
                  <>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {selectedArtifact.taskName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{selectedArtifact.taskPhase}</Badge>
                        <Badge variant={selectedArtifact.taskStatus === 'completed' ? 'default' : 'outline'}>
                          {selectedArtifact.taskStatus}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadArtifact(selectedArtifact)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {String(selectedArtifact.content)}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a document to view</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
