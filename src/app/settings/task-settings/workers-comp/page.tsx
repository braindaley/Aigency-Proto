
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Define the Task interface based on your data structure
interface Task {
  id: string;
  name: string;
  // Add other relevant fields like 'phase' if you have them
}

export default function WorkersCompTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksCollection = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollection);
        const tasksList = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(tasksList);
      } catch (err) {
        console.error("Error fetching tasks: ", err);
        setError('Failed to load tasks. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

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
          <Link href="/settings/task-settings/new?policyType=workers-comp">
            <Plus className="mr-2 h-4 w-4" /> New task
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 mb-8">Manage global tasks for Worker's Comp policies.</p>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : tasks.length > 0 ? (
            <ul className="divide-y">
              {tasks.map((task) => (
                <li key={task.id} className="py-3">
                  <p className="font-medium">{task.name || 'Unnamed Task'}</p>
                  <p className="text-sm text-muted-foreground">ID: {task.id}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No tasks found in the database.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
