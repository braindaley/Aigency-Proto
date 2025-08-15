import Link from 'next/link';
import { tasks } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ThumbsUp, Sparkles } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  waiting: <Clock className="h-4 w-4 text-muted-foreground" />,
  approved: <ThumbsUp className="h-4 w-4 text-muted-foreground" />,
  ai: <Sparkles className="h-4 w-4 text-muted-foreground" />,
};

const TaskItem = ({ task }: { task: Task }) => (
  <Card key={task.id} className="border-0 shadow-none">
    <CardContent className="p-0 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          {statusIcons[task.status]}
        </div>
        <p>{task.title}</p>
      </div>
      <Button asChild variant="outline" className="h-8 px-4">
        <Link href={`/tasks/${task.id}`}>
          View
        </Link>
      </Button>
    </CardContent>
  </Card>
);

export default function Home() {
  const needsAttentionTasks = tasks.filter((task) => task.status === 'ai');
  const upcomingTasks = tasks.filter((task) => task.status === 'waiting');
  const completeTasks = tasks.filter((task) => task.status === 'approved');

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <header className="text-left mb-12">
        <h1 className="text-2xl font-bold tracking-tight mb-2 font-headline">
          Aigency-Proto
        </h1>
      </header>
      
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-left">Needs attention</h2>
          {needsAttentionTasks.length > 0 ? (
            needsAttentionTasks.map((task: Task) => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <p className="text-muted-foreground">No tasks need your attention.</p>
          )}
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-left">Upcoming</h2>
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task: Task) => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <p className="text-muted-foreground">No upcoming tasks.</p>
          )}
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-left">Complete</h2>
          {completeTasks.length > 0 ? (
            completeTasks.map((task: Task) => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <p className="text-muted-foreground">No tasks have been completed.</p>
          )}
        </section>
      </div>
    </div>
  );
}
