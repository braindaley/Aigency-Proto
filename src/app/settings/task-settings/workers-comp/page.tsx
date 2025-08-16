
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Task, TaskPhase } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const PHASES_ORDER: TaskPhase[] = ['Submission', 'Marketing', 'Proposal', 'Binding', 'Policy Check-In'];

export default function WorkersCompTasksPage() {
  const [tasksByPhase, setTasksByPhase] = useState<Record<TaskPhase, Task[]>>({
    'Submission': [],
    'Marketing': [],
    'Proposal': [],
    'Binding': [],
    'Policy Check-In': [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksCollection = collection(db, 'tasks');
        const q = query(tasksCollection, where('policyType', '==', 'workers-comp'));
        const tasksSnapshot = await getDocs(q);
        
        const tasksList = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        const groupedTasks = tasksList.reduce((acc, task) => {
          const phase = task.phase;
          if (!acc[phase]) {
            acc[phase] = [];
          }
          acc[phase].push(task);
          return acc;
        }, {} as Record<TaskPhase, Task[]>);

        // Ensure all phases are present, even if empty
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

    fetchTasks();
  }, []);

  const renderTaskList = (tasks: Task[]) => {
    if (tasks.length === 0) {
      return <p className="text-sm text-muted-foreground px-4 pb-4">No tasks in this phase.</p>;
    }
    return (
      <ul className="divide-y">
        {tasks.map((task) => (
           <li key={task.id}>
            <Link href={`/settings/task-settings/workers-comp/${task.id}`} className="flex items-center justify-between p-4 hover:bg-accent">
                <div className="flex-1">
                  <p className="font-medium">{task.taskName || 'Unnamed Task'}</p>
                  <p className="text-sm text-muted-foreground">ID: {task.id}</p>
                </div>
                <Badge variant={task.tag === 'ai' ? 'default' : 'secondary'}>{task.tag}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    );
  };
  

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 md:py-12">
      <div className="mb-8">
        <Link href="/settings/task-settings" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Task Settings
        </Link>
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
      
      <div className="mt-8">
          {loading ? (
            <Card>
                <CardHeader>
                    <CardTitle>All Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-3/4" />
                    </div>
                </CardContent>
            </Card>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <Accordion type="multiple" defaultValue={PHASES_ORDER} className="w-full">
                {PHASES_ORDER.map(phase => (
                    <AccordionItem value={phase} key={phase}>
                        <AccordionTrigger className="px-4 text-base font-semibold">
                            {phase}
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            {renderTaskList(tasksByPhase[phase])}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
          )}
      </div>
    </div>
  );
}
