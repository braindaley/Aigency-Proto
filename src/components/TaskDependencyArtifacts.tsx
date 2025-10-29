'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, RefreshCw, Copy, FileCode, Loader2, Mail, CheckCircle2, Paperclip } from 'lucide-react';
import { CompanyTask, Submission } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskChat } from '@/components/TaskChat';
import { useToast } from '@/hooks/use-toast';

// Create a permissive sanitize schema that allows all standard HTML/markdown elements
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'class', 'style'] // Allow common attributes
  }
};

interface DependencyArtifact {
  taskId: string;
  taskName: string;
  taskPhase: string;
  taskStatus: string;
  content: string;
  timestamp?: Date;
  artifactIndex?: number;
  totalArtifacts?: number;
}

interface TaskDependencyArtifactsProps {
  task: CompanyTask;
  companyId: string;
  onTaskUpdate: () => void;
  isEmailTask?: boolean;
}

export function TaskDependencyArtifacts({ task, companyId, onTaskUpdate, isEmailTask = false }: TaskDependencyArtifactsProps) {
  const [artifacts, setArtifacts] = useState<DependencyArtifact[]>([]);
  const [emailSubmissions, setEmailSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<DependencyArtifact | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [jobProgress, setJobProgress] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadDependencyArtifacts();
  }, [task.id, companyId]);

  // Set up real-time listener for submissions (for email tasks)
  useEffect(() => {
    if (!isEmailTask || !task.id || !companyId) return;

    const submissionsRef = collection(db, `companies/${companyId}/submissions`);
    const q = query(submissionsRef, where('taskId', '==', task.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSubmissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];

      // Sort by createdAt
      loadedSubmissions.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setEmailSubmissions(loadedSubmissions);
      if (loadedSubmissions.length > 0 && !selectedSubmission) {
        setSelectedSubmission(loadedSubmissions[0]);
      }
    });

    return () => unsubscribe();
  }, [isEmailTask, task.id, companyId]);

  // Add initial assistant message for email tasks
  const ensureInitialEmailMessage = async (emailCount: number) => {
    try {
      // Check if there's already a message
      const messagesRef = collection(db, `companies/${companyId}/tasks/${task.id}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);

      if (messagesSnapshot.empty) {
        // Add initial assistant message
        await addDoc(messagesRef, {
          role: 'assistant',
          content: `I've prepared ${emailCount} marketing email${emailCount !== 1 ? 's' : ''} for your review. Please review each email on the left side.\n\nWhen you're ready to send all emails, please let me know and I'll send them to the carriers.`,
          createdAt: serverTimestamp(),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error adding initial email message:', error);
    }
  };

  // Set up real-time listener for job progress
  useEffect(() => {
    const jobRef = doc(db, 'aiTaskJobs', task.id);

    const unsubscribe = onSnapshot(jobRef, (snapshot) => {
      if (snapshot.exists()) {
        const jobData = snapshot.data();
        setJobStatus(jobData.status || '');
        setJobProgress(jobData.progress || '');

        // If job completed or failed, reload artifacts and update task
        if (jobData.status === 'completed') {
          setIsAutoExecuting(false);
          loadDependencyArtifacts();
          if (onTaskUpdate) {
            onTaskUpdate();
          }
          toast({
            title: '✅ Task Completed',
            description: `${task.taskName} has been completed successfully.`,
          });
        } else if (jobData.status === 'failed') {
          setIsAutoExecuting(false);
          toast({
            title: 'Task Failed',
            description: jobData.progress || 'An error occurred during processing.',
            variant: 'destructive',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [task.id]);

  const loadDependencyArtifacts = async () => {
    setLoading(true);
    const loadedArtifacts: DependencyArtifact[] = [];

    try {
      // If this is an email task, load submissions instead of artifacts
      if (isEmailTask) {
        const submissionsRef = collection(db, `companies/${companyId}/submissions`);
        const q = query(submissionsRef, where('taskId', '==', task.id));
        const submissionsSnapshot = await getDocs(q);

        const loadedSubmissions = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Submission[];

        // Sort by createdAt
        loadedSubmissions.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setEmailSubmissions(loadedSubmissions);
        if (loadedSubmissions.length > 0) {
          setSelectedSubmission(loadedSubmissions[0]);

          // Add an initial assistant message if there are submissions and no messages yet
          await ensureInitialEmailMessage(loadedSubmissions.length);
        }
        setLoading(false);
        return loadedSubmissions.length > 0;
      }

      // Get all artifacts for this company
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const artifactsSnapshot = await getDocs(artifactsRef);

      // FIRST: Load the current task's own artifacts (ALL of them for multi-artifact tasks)
      const currentTaskArtifacts = artifactsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.taskId === task.id;
      });

      if (currentTaskArtifacts.length > 0) {
        // Sort by artifactIndex if available
        const sortedArtifacts = currentTaskArtifacts.sort((a, b) => {
          const aIndex = a.data().artifactIndex ?? 0;
          const bIndex = b.data().artifactIndex ?? 0;
          return aIndex - bIndex;
        });

        // Add each artifact separately (for multi-artifact tasks like marketing emails)
        sortedArtifacts.forEach((artifactDoc, index) => {
          const artifactData = artifactDoc.data();
          const artifactId = artifactData.artifactId || artifactData.name;

          // Ensure artifactId is a string - handle case where it might be an object
          const displayName = typeof artifactId === 'string'
            ? artifactId
            : (typeof artifactId === 'object' && artifactId?.name)
              ? String(artifactId.name)
              : `${task.taskName} (${index + 1}/${sortedArtifacts.length})`;

          loadedArtifacts.push({
            taskId: `${task.id}-${index}`, // Unique ID for each artifact
            taskName: displayName,
            taskPhase: task.phase,
            taskStatus: task.status,
            content: artifactData.data || '',
            timestamp: artifactData.updatedAt?.toDate?.() || artifactData.createdAt?.toDate?.(),
            artifactIndex: index,
            totalArtifacts: sortedArtifacts.length
          });
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

      // Call Firebase Cloud Function for AI task processing
      // This runs on Google Cloud with 9-minute timeout (no Netlify limits!)
      const functions = getFunctions();
      const processAITask = httpsCallable(functions, 'processAITask');

      const result = await processAITask({
        taskId: task.id,
        companyId: companyId,
      });

      console.log(`[TaskDependencyArtifacts] Cloud Function result:`, result);

      // Show toast that processing has started
      toast({
        title: 'Processing Started',
        description: 'AI task is being processed by Cloud Function. You\'ll be notified when it completes.',
      });

      // The real-time listener will handle updates and completion
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
    // For AI tasks, re-run the task to regenerate artifacts with latest prompt
    if (task.tag === 'ai') {
      setIsAutoExecuting(true);
      try {
        // Call Firebase Cloud Function for AI task processing
        const functions = getFunctions();
        const processAITask = httpsCallable(functions, 'processAITask');

        const result = await processAITask({
          taskId: task.id,
          companyId: companyId,
        });

        console.log('Cloud Function result for re-execution:', result);

        toast({
          title: '🔄 Re-running Task',
          description: 'Artifact is being regenerated by Cloud Function. You\'ll be notified when complete.',
        });

        // The real-time listener will handle completion
      } catch (error) {
        console.error('Error calling Cloud Function:', error);
        toast({
          title: "Error processing task",
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: "destructive",
        });
        setIsAutoExecuting(false);
      }
    } else {
      // For non-AI tasks, just reload the artifacts display
      await loadDependencyArtifacts();
      toast({
        title: "Artifacts refreshed",
        description: "The artifacts have been reloaded.",
      });
    }
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
              <div className="text-center px-8 max-w-md">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {jobStatus === 'processing' ? 'Processing Task...' : 'Queueing Task...'}
                </p>
                {jobProgress && (
                  <p className="text-sm text-muted-foreground mt-2 mb-4">{jobProgress}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This may take a minute. You'll be notified when complete.
                </p>
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
            isEmailTask ? (
              emailSubmissions.length > 0 ? (
                <div className="space-y-1 max-w-[80%] border rounded-lg overflow-hidden">
                  {(() => {
                    // Group submissions by carrier name
                    const groupedByCarrier = emailSubmissions.reduce((acc, submission) => {
                      let carrierName = submission.carrierName || 'Unknown Carrier';
                      // Normalize carrier name
                      carrierName = carrierName
                        .replace(/\s+Follow\s+Up$/i, '')
                        .replace(/\s+Insurance\s+Group$/i, '')
                        .trim();

                      if (!acc[carrierName]) {
                        acc[carrierName] = [];
                      }
                      acc[carrierName].push(submission);
                      return acc;
                    }, {} as Record<string, typeof emailSubmissions>);

                    return Object.entries(groupedByCarrier).map(([carrierName, carrierSubmissions]) => (
                      <div key={carrierName}>
                        {carrierSubmissions.map((submission) => (
                          <div
                            key={submission.id}
                            onClick={() => setSelectedSubmission(submission)}
                            className={`px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${
                              selectedSubmission?.id === submission.id ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="truncate">
                                  <span className="text-muted-foreground">To: </span>
                                  <span className="font-medium">{carrierName}</span>
                                  <span className="text-muted-foreground mx-2">•</span>
                                  <span>{submission.subject || 'Workers\' Compensation Submission'}</span>
                                </div>
                              </div>
                              <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                                {submission.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No email submissions found for this task.</p>
                  <p className="text-xs mt-1">Submissions will appear here once the task creates them.</p>
                </div>
              )
            ) : artifacts.length > 0 ? (
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

      {/* Right Side: Artifact/Email Viewer */}
      <div className="w-1/2">
        {isEmailTask && selectedSubmission ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{selectedSubmission.carrierName}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedSubmission.status}</Badge>
                    {selectedSubmission.sentAt && (
                      <span className="text-xs text-muted-foreground">
                        Sent {new Date(selectedSubmission.sentAt.toMillis()).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => copyToClipboard(selectedSubmission.body)}
                    variant="outline"
                    size="sm"
                    title="Copy email body"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">To</div>
                    <div className="text-sm">{selectedSubmission.carrierEmail}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Subject</div>
                    <div className="text-sm">{selectedSubmission.subject}</div>
                  </div>
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {(() => {
                        let body = selectedSubmission.body;

                        // Remove the redundant header information from marketing emails
                        // Remove lines like "# Email to The Hartford"
                        body = body.replace(/^#\s+Email to[^\n]+\n\n?/i, '');

                        // Remove **Subject:** line
                        body = body.replace(/\*\*Subject:\*\*[^\n]+\n\n?/i, '');

                        // Remove **To:** line
                        body = body.replace(/\*\*To:\*\*[^\n]+\n\n?/i, '');

                        // Remove "## Email Body" header
                        body = body.replace(/##\s+Email Body\s*\n\n?/i, '');

                        // Remove "## Attached Documents" section since we show attachments separately
                        body = body.replace(/##\s+Attached Documents[\s\S]*?(?=\n##|\n\*\*|$)/i, '');

                        // Also remove any standalone "Attached Documents:" or similar headers
                        body = body.replace(/\*\*Attached Documents:?\*\*[\s\S]*?(?=\n\n[A-Z]|\n\*\*|$)/i, '');

                        return body.trim();
                      })()}
                    </ReactMarkdown>
                  </div>
                  {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Attachments</div>
                      <div className="space-y-1">
                        {selectedSubmission.attachments.map((attachment, idx) => (
                          <div key={idx} className="text-sm flex items-center gap-2 text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : selectedArtifact ? (
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
                  <div className="prose prose-base max-w-none bg-background text-foreground
                                  prose-headings:text-foreground prose-headings:font-semibold prose-headings:bg-transparent
                                  prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6 prose-h1:bg-transparent
                                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-semibold prose-h2:bg-transparent
                                  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold prose-h3:bg-transparent
                                  prose-p:text-foreground prose-p:leading-7 prose-p:mb-4 prose-p:bg-transparent
                                  prose-strong:text-foreground prose-strong:font-semibold
                                  prose-ul:my-4 prose-ul:pl-6 prose-ul:text-foreground
                                  prose-ol:my-4 prose-ol:pl-6 prose-ol:text-foreground
                                  prose-li:mb-2 prose-li:text-foreground prose-li:leading-relaxed
                                  prose-blockquote:border-l-4 prose-blockquote:border-l-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic
                                  prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-foreground
                                  prose-pre:bg-muted prose-pre:text-foreground
                                  [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                                  [&_pre]:bg-muted [&_pre]:text-foreground [&_pre]:border [&_pre]:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}>
                      {(() => {
                        let content = String(selectedArtifact.content);

                        // More aggressive code fence stripping - try all variations
                        const patterns = [
                          /^```markdown\s*\n([\s\S]*?)\n```$/,
                          /^```\s*\n([\s\S]*?)\n```$/,
                          /^```markdown\s*([\s\S]*?)\s*```$/,
                          /^```\s*([\s\S]*?)\s*```$/,
                          /^```[a-z]*\s*\n([\s\S]*?)\n```$/,
                          /^```[a-z]*\s*([\s\S]*?)\s*```$/
                        ];

                        for (const pattern of patterns) {
                          const match = content.match(pattern);
                          if (match) {
                            content = match[1].trim();
                            break;
                          }
                        }

                        return content;
                      })()}
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
              {isEmailTask ? (
                <>
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an email to view</p>
                </>
              ) : (
                <>
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a document to view</p>
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
