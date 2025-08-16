
'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ThumbsUp, Sparkles, User, ArrowLeft, Plus } from 'lucide-react';
import type { Task, TaskTag, TaskPhase } from '@/lib/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const statusIcons: Record<TaskTag, React.ReactNode> = {
  waiting: <Clock className="h-4 w-4 text-muted-foreground" />,
  approved: <ThumbsUp className="h-4 w-4 text-muted-foreground" />,
  ai: <Sparkles className="h-4 w-4 text-muted-foreground" />,
  manual: <User className="h-4 w-4 text-muted-foreground" />,
};

const TaskItem = ({ task }: { task: Task }) => (
  <Card key={task.id} className="border-0 shadow-none">
    <CardContent className="p-0 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          {statusIcons[task.tag]}
        </div>
        <p>{task.taskName}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/settings/task-settings/${task.id}`}>View</Link>
      </Button>
    </CardContent>
  </Card>
);

const phases: TaskPhase[] = ['Submission', 'Marketing', 'Proposal', 'Binding', 'Policy Check-In'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'tasks'));
        const tasksData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Task));
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching tasks from Firestore:", error);
      }
    };

    fetchTasks();
  }, []);

  const tasksByPhase = phases.map(phase => ({
    phase,
    tasks: tasks.filter(task => task.phase === phase),
  }));

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Link href="/settings/task-settings" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Task Settings
        </Link>
      </div>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">Tasks: Workers Comp</h1>
        <Button asChild>
          <Link href="/settings/task-settings/new">
            <Plus className="mr-2 h-4 w-4" /> New Line
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 mb-8">Manage global tasks for Worker's Comp policies.</p>
      <div className="flex flex-col gap-8">
        {tasksByPhase.map(({ phase, tasks }) => (
          <section key={phase} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-left mb-4">{phase}</h2>
            {tasks.length > 0 ? (
              tasks.map((task: Task) => (
                <TaskItem key={task.id} task={task} />
              ))
            ) : (
              <p className="text-muted-foreground">No tasks in this phase.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
