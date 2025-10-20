
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CompanyTask } from '@/lib/types';
import { ArrowLeft, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TaskChat } from '@/components/TaskChat';
import { TaskAIArtifacts } from '@/components/TaskAIArtifacts';
import { AITaskCompletion } from '@/components/AITaskCompletion';
import { DependencyArtifactsReview } from '@/components/DependencyArtifactsReview';
import { TaskSubmissionsPanel } from '@/components/TaskSubmissionsPanel';
import { UnderwriterRepliesPanel } from '@/components/UnderwriterRepliesPanel';

export default function TaskDetailPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const [task, setTask] = useState<CompanyTask | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh task data
  const refreshTask = useCallback(async () => {
    if (companyId && taskId) {
      try {
        const taskDocRef = doc(db, 'companyTasks', taskId);
        const taskDoc = await getDoc(taskDocRef);

        if (taskDoc.exists()) {
          const newTaskData = { id: taskDoc.id, ...taskDoc.data() } as CompanyTask;
          
          setTask(prevTask => {
            // Check if status changed to completed
            if (prevTask && prevTask.status !== 'completed' && newTaskData.status === 'completed') {
              console.log('Task automatically completed!');
            }
            return newTaskData;
          });
        }
      } catch (error) {
        console.error('Error refreshing task:', error);
      }
    }
  }, [companyId, taskId]);

  useEffect(() => {
    if (companyId && taskId) {
      const fetchTask = async () => {
        setLoading(true);
        try {
          const taskDocRef = doc(db, 'companyTasks', taskId);
          const taskDoc = await getDoc(taskDocRef);

          if (taskDoc.exists()) {
            setTask({ id: taskDoc.id, ...taskDoc.data() } as CompanyTask);
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching task:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchTask();

      // Set up real-time listener for task status changes
      const taskDocRef = doc(db, 'companyTasks', taskId);

      const unsubscribe = onSnapshot(taskDocRef, (doc) => {
        if (doc.exists()) {
          const newTaskData = { id: doc.id, ...doc.data() } as CompanyTask;
          setTask(prevTask => {
            // Check if status changed to completed
            if (prevTask && prevTask.status !== 'completed' && newTaskData.status === 'completed') {
              console.log('🎉 Task status changed to completed!');
            }
            return newTaskData;
          });
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [companyId, taskId]);

  // Add page focus listener to refresh task data when user returns to page
  useEffect(() => {
    const handlePageFocus = () => {
      // Refresh task data when page gains focus (user returns to tab/page)
      refreshTask();
    };

    const handlePageVisibilityChange = () => {
      // Also refresh when page becomes visible again
      if (!document.hidden) {
        refreshTask();
      }
    };

    window.addEventListener('focus', handlePageFocus);
    document.addEventListener('visibilitychange', handlePageVisibilityChange);

    return () => {
      window.removeEventListener('focus', handlePageFocus);
      document.removeEventListener('visibilitychange', handlePageVisibilityChange);
    };
  }, [refreshTask]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href={`/companies/${companyId}/tasks`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Link>
          </Button>
          <div className="space-y-2">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href={`/companies/${companyId}/tasks`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Link>
          </Button>
          <p>Task not found.</p>
        </div>
      </div>
    );
  }

  if (task.tag === 'ai') {
    const wasAutoCompleted = task.status === 'completed' && (task as any).completedBy === 'AI System';
    const isSubmissionTask = task.sortOrder === 12 || task.sortOrder === 14 || task.taskName?.toLowerCase().includes('send submission') || task.taskName?.toLowerCase().includes('send follow-up');
    const isQuestionTask = task.sortOrder === 15 || task.taskName?.toLowerCase().includes('review flagged') || task.taskName?.toLowerCase().includes('underwriter questions');

    return (
      <div className="px-4 py-8 md:py-12">
        <div className={`mx-auto ${isSubmissionTask ? 'max-w-[1400px]' : 'max-w-[1400px]'}`}>
          <div className="max-w-[672px] mb-8">
            <Button asChild variant="ghost" className="mb-4 -ml-4">
              <Link href={`/companies/${companyId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Company
              </Link>
            </Button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{task.taskName}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{task.phase}</Badge>
                  <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                    {task.status}
                  </Badge>
                  {wasAutoCompleted && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Auto-Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {wasAutoCompleted && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      This task was automatically completed by AI
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      The AI executed this task when all dependencies were met. You can view the results below.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Show submissions panel for Task 12 & 14 (Send submission packets & follow-ups) */}
            {isSubmissionTask ? (
              <TaskSubmissionsPanel
                companyId={companyId || ''}
                taskId={taskId || ''}
                taskName={task.taskName}
                dependencyTaskIds={task.dependencies || []}
              />
            ) : isQuestionTask ? (
              /* Show chat + replies panel for Task 15 (Review underwriter questions) */
              <>
                <TaskChat task={task} companyId={companyId || ''} onTaskUpdate={refreshTask} />
                <UnderwriterRepliesPanel
                  companyId={companyId || ''}
                  taskId={taskId || ''}
                />
              </>
            ) : (
              <TaskAIArtifacts task={task} companyId={companyId || ''} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link href={`/companies/${companyId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Link>
        </Button>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{task.taskName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{task.phase}</Badge>
              <Badge variant="outline">{task.status}</Badge>
            </div>
          </div>
        </div>

      </div>

      {/* Show dependency artifacts review if task has dependencies and flag is enabled */}
      {task.dependencies && task.dependencies.length > 0 && task.showDependencyArtifacts && (
        <DependencyArtifactsReview task={task} companyId={companyId || ''} />
      )}

      <AITaskCompletion task={task} companyId={companyId || ''} onTaskUpdate={refreshTask} />
      <TaskChat task={task} companyId={companyId || ''} onTaskUpdate={refreshTask} />
    </div>
  );
}
