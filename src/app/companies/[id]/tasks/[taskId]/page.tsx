
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CompanyTask } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function TaskDetailPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const [task, setTask] = useState<CompanyTask | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
  }, [companyId, taskId]);

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
        <div className="mb-8">
            <Button asChild variant="ghost" className="mb-4 -ml-4">
                <Link href={`/companies/${companyId}/tasks`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Tasks
                </Link>
            </Button>
            {loading ? (
                <div className="space-y-2">
                    <Skeleton className="h-9 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
            ) : task ? (
                 <div>
                    <h1 className="text-3xl font-bold">{task.taskName}</h1>
                    <p className="text-muted-foreground mt-2">
                        {task.description}
                    </p>
                </div>
            ) : (
                <p>Task not found.</p>
            )}
        </div>
    </div>
  );
}
