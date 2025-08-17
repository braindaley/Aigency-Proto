
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, User, Sparkles, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Task, TaskPhase } from '@/lib/types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useToast } from '@/hooks/use-toast';

const PHASES_ORDER: TaskPhase[] = ['Submission', 'Marketing', 'Proposal', 'Binding', 'Policy Check-In'];

export default function WorkersCompTasksPage() {
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

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksCollection = collection(db, 'tasks');
      const q = query(tasksCollection, where('policyType', '==', 'workers-comp'));
      const tasksSnapshot = await getDocs(q);
      
      const tasksList = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

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

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    const sourcePhase = source.droppableId as TaskPhase;
    const destPhase = destination.droppableId as TaskPhase;

    const newTasksByPhase = { ...tasksByPhase };
    const sourceTasks = Array.from(newTasksByPhase[sourcePhase]);
    const [movedTask] = sourceTasks.splice(source.index, 1);

    if (sourcePhase === destPhase) {
      sourceTasks.splice(destination.index, 0, movedTask);
      newTasksByPhase[sourcePhase] = sourceTasks;
    } else {
      const destTasks = Array.from(newTasksByPhase[destPhase]);
      destTasks.splice(destination.index, 0, { ...movedTask, phase: destPhase });
      newTasksByPhase[sourcePhase] = sourceTasks;
      newTasksByPhase[destPhase] = destTasks;
    }

    setTasksByPhase(newTasksByPhase);

    // After reordering, flatten all tasks to update sortOrder and dependencies
    const allTasks: Task[] = [];
    PHASES_ORDER.forEach(phase => {
        allTasks.push(...(newTasksByPhase[phase] || []));
    });

    const batch = writeBatch(db);
    allTasks.forEach((task, index) => {
        const taskRef = doc(db, 'tasks', task.id.toString());
        const previousTaskId = index > 0 ? allTasks[index - 1].id.toString() : null;
        
        const updates: Partial<Task> = {
            sortOrder: index + 1,
            phase: task.phase, // This is updated if moved to a new phase
            dependencies: previousTaskId ? [previousTaskId] : [],
        };

        batch.update(taskRef, updates);
    });

    try {
        await batch.commit();
        toast({
            title: "Tasks Reordered",
            description: "Successfully updated task order and dependencies.",
        });
        // Refetch to ensure local state is in sync with Firestore
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
      <Droppable droppableId={phase}>
        {(provided) => (
          <ul {...provided.droppableProps} ref={provided.innerRef} className="border-t-0">
            {tasks.map((task, index) => (
              <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <li
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`flex items-center justify-between p-4 ${snapshot.isDragging ? 'bg-accent shadow-lg' : ''}`}
                    style={{...provided.draggableProps.style}}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
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
                      <Link href={`/settings/task-settings/workers-comp/${task.id}`}>
                        View
                      </Link>
                    </Button>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
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
            <h1 className="text-3xl font-bold">Tasks: Workers Comp</h1>
            <p className="text-muted-foreground mt-2">Manage global tasks for Worker's Comp policies.</p>
        </div>
        <Button asChild>
          <Link href="/settings/task-settings/new?policyType=workers-comp">
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
            <DragDropContext onDragEnd={onDragEnd}>
              <Accordion type="multiple" defaultValue={PHASES_ORDER} className="w-full">
                {PHASES_ORDER.map(phase => (
                  <AccordionItem value={phase} key={phase} className="border-b-0">
                    <AccordionTrigger className="px-6 text-base font-semibold hover:no-underline">
                      <h2>{phase} ({tasksByPhase[phase].length})</h2>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      {renderTaskList(tasksByPhase[phase], phase)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
