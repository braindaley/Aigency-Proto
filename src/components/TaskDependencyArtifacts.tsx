'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, RefreshCw, Copy, FileCode } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskChat } from '@/components/TaskChat';
import { useToast } from '@/hooks/use-toast';

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
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const { toast } = useToast();

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

      // Return whether this task has an artifact
      return currentTaskArtifacts.length > 0;
    } catch (error) {
      console.error('Error loading artifacts:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if the system prompt has already been executed
  // Returns true if artifact exists OR task is already completed
  const hasSystemPromptExecuted = async (): Promise<boolean> => {
    try {
      // Check if task is already completed
      const taskStatus = (task as any).status;
      if (taskStatus === 'completed' || taskStatus === 'Complete') {
        console.log(`[TaskDependencyArtifacts] Task ${task.id} already completed, skipping auto-execution`);
        return true;
      }

      // Check if an artifact exists for this task
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const artifactsSnapshot = await getDocs(artifactsRef);

      const hasArtifact = artifactsSnapshot.docs.some(doc => {
        const data = doc.data();
        return data.taskId === task.id;
      });

      if (hasArtifact) {
        console.log(`[TaskDependencyArtifacts] Task ${task.id} already has artifact, skipping auto-execution`);
      }

      return hasArtifact;
    } catch (error) {
      console.error('[TaskDependencyArtifacts] Error checking execution status:', error);
      return false; // If we can't check, assume it hasn't run to be safe
    }
  };

  // Auto-execute system prompt if conditions are met
  // This function:
  // 1. Checks if the task is an AI task and hasn't been executed yet
  // 2. Calls /api/ai-task-completion which:
  //    - Generates artifact using the system prompt
  //    - Runs test criteria validation (if defined)
  //    - Only marks task as completed if BOTH artifact exists AND tests pass
  // 3. Reloads artifacts and updates UI with results
  const autoExecuteSystemPrompt = async () => {
    try {
      // Only auto-execute for AI tasks
      if (task.tag !== 'ai') {
        return;
      }

      // Check if task has a system prompt (either on task or will be fetched from template)
      const hasSystemPrompt = !!(task as any).systemPrompt;
      console.log(`[TaskDependencyArtifacts] Task ${task.id} has systemPrompt: ${hasSystemPrompt}`);

      // Check if already executed
      const alreadyExecuted = await hasSystemPromptExecuted();
      if (alreadyExecuted) {
        return;
      }

      console.log(`[TaskDependencyArtifacts] Auto-executing system prompt for task ${task.id}: "${task.taskName}"`);
      setIsAutoExecuting(true);

      // Call the AI task completion endpoint
      // This endpoint will automatically run test criteria validation if defined
      const response = await fetch('/api/ai-task-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          companyId: companyId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute system prompt');
      }

      const result = await response.json();
      console.log(`[TaskDependencyArtifacts] System prompt execution result:`, result);

      // Reload artifacts to show the newly created artifact
      await loadDependencyArtifacts();

      // Notify parent to refresh task status
      if (onTaskUpdate) {
        onTaskUpdate();
      }

      // Show success toast based on completion status
      if (result.taskCompleted) {
        toast({
          title: '✅ Task Completed',
          description: `${task.taskName} has been completed and validated successfully.`,
        });
      } else if (result.success) {
        // Task executed but not completed (either no test criteria or tests failed)
        const hasTestCriteria = !!(task as any).testCriteria;
        toast({
          title: 'System Prompt Executed',
          description: hasTestCriteria
            ? 'AI generated the artifact. Check the chat for test validation results.'
            : 'AI has generated the artifact. Manual review may be required.',
        });
      }
    } catch (error) {
      console.error('[TaskDependencyArtifacts] Error auto-executing system prompt:', error);
      // Don't show error toast for auto-execution failures to avoid disrupting UX
    } finally {
      setIsAutoExecuting(false);
    }
  };

  // Auto-execute on mount if needed
  useEffect(() => {
    // Run auto-execution after artifacts are loaded
    if (!loading) {
      autoExecuteSystemPrompt();
    }
  }, [loading]); // Only run when loading changes from true to false

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

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "The artifact content has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const refreshArtifacts = async () => {
    await loadDependencyArtifacts();
    toast({
      title: "Artifacts refreshed",
      description: "The artifacts have been reloaded.",
    });
  };

  if (loading || isAutoExecuting) {
    return (
      <div className="flex gap-6 h-[calc(100vh-200px)] bg-background">
        <div className="w-1/2 flex flex-col">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="w-1/2">
          {isAutoExecuting ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg font-medium">Executing System Prompt...</p>
                <p className="text-sm text-muted-foreground mt-2">AI is processing the task with available data</p>
              </div>
            </Card>
          ) : (
            <Skeleton className="h-full w-full" />
          )}
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
              <div className="space-y-2 max-w-[80%]">
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
                <div>
                  {selectedArtifact.taskId !== task.id && (
                    <>
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
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'source')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="preview" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="source" className="text-xs">
                        <FileCode className="h-3 w-3 mr-1" />
                        Source
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button
                    onClick={refreshArtifacts}
                    variant="outline"
                    size="sm"
                    title="Refresh artifacts"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(selectedArtifact.content)}
                    variant="outline"
                    size="sm"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => downloadArtifact(selectedArtifact)}
                    variant="outline"
                    size="sm"
                    title="Download artifact"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {viewMode === 'preview' ? (
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
                ) : (
                  <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto">
                    <code className="text-sm font-mono text-foreground">
                      {String(selectedArtifact.content)}
                    </code>
                  </pre>
                )}
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
