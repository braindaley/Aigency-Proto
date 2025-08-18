'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, User, Sparkles, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Task, TaskPhase } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PHASES_ORDER: TaskPhase[] = ['Submission', 'Marketing', 'Proposal', 'Binding', 'Policy Check-In'];

export default function AutoTasksPage() {
  const { toast } = useToast();
  const [tasksByPhase, setTasksByPhase] = useState<Record<TaskPhase, Task[]>>({
    'Submission': [],
    'Marketing': [],
    'Proposal': [],
    'Binding': [],
    'Policy Check-In': [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drag and Drop state
  const [dragging, setDragging] = useState(false);
  const dragItem = useRef<Task | null>(null);
  const dragOverItem = useRef<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksCollection = collection(db, 'tasks');
      const q = query(tasksCollection, where('policyType', '==', 'auto'));
      const tasksSnapshot = await getDocs(q);
      
      const tasksList = tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        // Explicitly exclude the 'id' field from the document's data
        const { id, ...rest } = data;
        return { ...rest, id: doc.id } as Task;
      });

      tasksList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      const groupedTasks = tasksList.reduce((acc, task) => {
        const phase: TaskPhase = task.phase && PHASES_ORDER.includes(task.phase) ? task.phase : 'Submission';
        if (!acc[phase]) {
          acc[phase] = [];
        }
        acc[phase].push(task);
        return acc;
      }, {} as Record<TaskPhase, Task[]>);

      const finalGroupedTasks = PHASES_ORDER.reduce((acc, phase) => {
          acc[phase] = groupedTasks[phase] || [];
          return acc;
      }, {} as Record<TaskPhase, Task[]>);

      setTasksByPhase(finalGroupedTasks);

    } catch (err) {
      console.error("Error fetching tasks: ", err);
      setError('Failed to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, task: Task) => {
    dragItem.current = task;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setDragging(true), 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, task: Task) => {
    e.preventDefault();
    dragOverItem.current = task;
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLLIElement>, targetPhase: TaskPhase) => {
    e.preventDefault();
    setDragging(false);

    const sourceTask = dragItem.current;
    const targetTask = dragOverItem.current;

    if (!sourceTask || !targetTask || sourceTask.id === targetTask.id) {
      return;
    }

    try {
        // Get all tasks for reordering
        const allTasks = Object.values(tasksByPhase).flat();
        allTasks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // Remove source task from its current position
        const withoutSource = allTasks.filter(task => task.id !== sourceTask.id);
        
        // Find target index
        const targetIndex = withoutSource.findIndex(task => task.id === targetTask.id);
        
        // Insert source task at target position
        const reorderedTasks = [...withoutSource];
        reorderedTasks.splice(targetIndex, 0, { ...sourceTask, phase: targetPhase });

        // Update sort orders and dependencies
        const batch = writeBatch(db);
        reorderedTasks.forEach((task, index) => {
            const taskRef = doc(db, 'tasks', task.id.toString());
            const previousTaskId = index > 0 ? reorderedTasks[index - 1].id.toString() : null;
            batch.update(taskRef, {
                sortOrder: index + 1,
                phase: index === targetIndex ? targetPhase : task.phase,
                dependencies: previousTaskId ? [previousTaskId] : [],
            });
        });

        await batch.commit();
        
        toast({
            title: "Tasks Reordered",
            description: "Successfully updated task order and dependencies.",
        });
        await fetchTasks();
    } catch (err) {
        console.error("Error updating tasks:", err);
        setError("Failed to save new order. Please refresh and try again.");
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save task order.",
        });
    }
  };

  const renderTaskList = (tasks: Task[], phase: TaskPhase) => {
    if (tasks.length === 0) {
      return <p className="text-sm text-muted-foreground px-4 py-4 text-center">No tasks in this phase.</p>;
    }
    return (
      <ul className="border-t-0" onDragOver={handleDragOver}>
        {tasks.map((task) => (
          <li
            key={task.id.toString()}
            draggable
            onDragStart={(e) => handleDragStart(e, task)}
            onDragEnter={(e) => handleDragEnter(e, task)}
            onDrop={(e) => handleDrop(e, phase)}
            onDragOver={handleDragOver}
            className={cn('flex items-center justify-between p-4 cursor-grab', {
              'opacity-50': dragging && dragItem.current?.id === task.id,
            })}
          >
            <div className="flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {task.sortOrder}
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {task.tag === 'ai' ? (
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">{task.taskName || 'Unnamed Task'}</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/settings/task-settings/auto/${task.id}`}>
                View
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button variant="ghost" asChild className="-ml-4">
            <Link href="/settings/task-settings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Task Settings
            </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center mb-2">
        <div>
            <h1 className="text-3xl font-bold">Tasks: Auto</h1>
            <p className="text-muted-foreground mt-2">Manage global tasks for Auto policies.</p>
        </div>
        <Button asChild>
          <Link href="/settings/task-settings/new?policyType=auto">
            <Plus className="mr-2 h-4 w-4" /> New task
          </Link>
        </Button>
      </div>
      
      <Card className="mt-8 border-0 shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : error ? (
            <p className="text-destructive p-6">{error}</p>
          ) : (
            <Accordion type="multiple" defaultValue={PHASES_ORDER} className="w-full">
              {PHASES_ORDER.map(phase => (
                <AccordionItem value={phase} key={phase} className="border-b-0">
                  <AccordionTrigger className="px-4 py-3 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{phase}</h3>
                      <span className="text-sm text-muted-foreground">
                        ({tasksByPhase[phase]?.length || 0} tasks)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    {renderTaskList(tasksByPhase[phase] || [], phase)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}