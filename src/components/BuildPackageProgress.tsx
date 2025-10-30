'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CompanyTask } from '@/lib/types';

interface BuildPackageProgressProps {
  taskIds: string[];
}

interface TaskProgress {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

const TASK_NAMES = [
  'Research OSHA data',
  'Complete ACORD 130',
  'Complete ACORD 125',
  'Write narrative',
  'Generate coverage suggestions',
];

export function BuildPackageProgress({ taskIds }: BuildPackageProgressProps) {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);

  useEffect(() => {
    if (!taskIds || taskIds.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    // Subscribe to each task
    taskIds.forEach((taskId, index) => {
      if (!taskId) return;

      const taskRef = doc(db, 'companyTasks', taskId);
      const unsubscribe = onSnapshot(taskRef, (snapshot) => {
        if (snapshot.exists()) {
          const taskData = snapshot.data() as CompanyTask;

          setTasks((prevTasks) => {
            const newTasks = [...prevTasks];
            const taskIndex = newTasks.findIndex((t) => t.id === taskId);

            const taskProgress: TaskProgress = {
              id: taskId,
              name: TASK_NAMES[index] || taskData.taskName,
              status: taskData.status === 'Complete' || taskData.status === 'completed' ? 'completed' :
                      taskData.status === 'Needs attention' ? 'in_progress' :
                      'pending',
            };

            if (taskIndex >= 0) {
              newTasks[taskIndex] = taskProgress;
            } else {
              newTasks.push(taskProgress);
            }

            return newTasks.sort((a, b) =>
              taskIds.indexOf(a.id) - taskIds.indexOf(b.id)
            );
          });
        }
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [taskIds]);

  return (
    <div className="space-y-3 py-4">
      <h3 className="text-sm font-semibold mb-4">Processing Tasks</h3>
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3">
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : task.status === 'in_progress' ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span
            className={`text-sm ${
              task.status === 'completed'
                ? 'text-muted-foreground line-through'
                : task.status === 'in_progress'
                ? 'text-foreground font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {task.name}
          </span>
        </div>
      ))}
    </div>
  );
}
