
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
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
          // Default to 'Submission' if phase is missing or invalid
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

    fetchTasks();
  }, []);

  const renderTaskList = (tasks: Task[]) => {
    if (tasks.length === 0) {
      return <p className="text-sm text-muted-foreground px-4 py-4 text-center">No tasks in this phase.</p>;
    }
    return (
      <ul className="divide-y border-t">
        {tasks.map((task) => (
           <li key={task.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    {task.tag === 'ai' ? (
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div>
                        <p className="font-medium">{task.taskName || 'Unnamed Task'}</p>
                        {task.tag && <Badge variant={task.tag === 'ai' ? 'default' : 'secondary'} className="mt-1">{task.tag}</Badge>}
                    </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/settings/task-settings/workers-comp/${task.id}`}>
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
                <Accordion type="multiple" defaultValue={PHASES_ORDER} className="w-full">
                    {PHASES_ORDER.map(phase => (
                        <AccordionItem value={phase} key={phase} className="border-b-0">
                            <AccordionTrigger className="px-6 text-base font-semibold hover:no-underline">
                                {phase} ({tasksByPhase[phase].length})
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                                {renderTaskList(tasksByPhase[phase])}
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
