
'use client';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Sparkles, User } from 'lucide-react';
import type { Subtask, Task } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

export default function CompanyTaskDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  useEffect(() => {
    if (!taskId) {
      notFound();
      return;
    }

    const fetchTask = async () => {
      try {
        const taskDocRef = doc(db, 'companyTasks', taskId);
        const taskDoc = await getDoc(taskDocRef);

        if (!taskDoc.exists()) {
          notFound();
          return;
        }
        
        const taskData = { id: taskDoc.id, ...taskDoc.data() } as Task;
        setTask(taskData);
        // Ensure subtasks have a 'completed' property
        const initializedSubtasks = (taskData.subtasks || []).map(st => ({
            ...st,
            completed: st.completed || false,
        }));
        setSubtasks(initializedSubtasks);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [taskId]);

  const handleSubtaskToggle = useCallback(async (subtaskId: number) => {
    if (!taskId) return;
    
    const updatedSubtasks = subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
    );
    setSubtasks(updatedSubtasks);

    try {
      const taskDocRef = doc(db, 'companyTasks', taskId);
      await updateDoc(taskDocRef, {
        subtasks: updatedSubtasks,
      });
       toast({
        title: "Subtask updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error("Error updating subtask: ", error);
      // Revert state on error
      setSubtasks(subtasks);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save subtask. Please try again.",
      });
    }
  }, [taskId, subtasks, toast]);
  
  if (loading) {
    return (
       <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
        <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-6 w-32" />
        </div>
        <Card className="border-0 shadow-none">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                </div>
                <div className="pt-2 space-y-2">
                    <Skeleton className="h-4 w-full" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </CardContent>
        </Card>
       </div>
    );
  }

  if (!task) {
    notFound();
    return null;
  }

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" asChild>
          <Link href={`/companies/${companyId}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to company
          </Link>
        </Button>
      </div>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center gap-4">
            <p className="font-bold uppercase text-base leading-4">ID {task.templateId}</p>
            <Badge variant="secondary">{task.phase}</Badge>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {task.tag === 'ai' ? (
                <Sparkles className="h-6 w-6 text-muted-foreground" />
            ) : (
                <User className="h-6 w-6 text-muted-foreground" />
            )}
            <h1 className="text-2xl font-bold">{task.taskName}</h1>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {subtasks && subtasks.length > 0 && (
            <div className="space-y-2">
              <Label>Sub-tasks</Label>
              <div className="space-y-3 pt-2">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`subtask-${subtask.id}`}
                      checked={subtask.completed}
                      onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                    />
                    <label
                      htmlFor={`subtask-${subtask.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {subtask.text}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Description</Label>
            <p className="text-muted-foreground text-sm">{task.description}</p>
          </div>

          {task.tag === 'ai' && task.systemPrompt && (
            <div className="space-y-2">
              <Label>System prompt</Label>
              <p className="text-muted-foreground text-sm font-mono bg-muted p-4 rounded-md whitespace-pre-wrap">{task.systemPrompt}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
