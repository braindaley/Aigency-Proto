import { tasks } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Clock, ThumbsUp, Sparkles, User } from 'lucide-react';
import type { TaskTag } from '@/lib/types';

const tagIcons: Record<TaskTag, React.ReactNode> = {
  waiting: <Clock className="h-8 w-8 text-muted-foreground" />,
  approved: <ThumbsUp className="h-8 w-8 text-muted-foreground" />,
  ai: <Sparkles className="h-8 w-8 text-muted-foreground" />,
  manual: <User className="h-8 w-8 text-muted-foreground" />,
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const task = tasks.find((task) => task.id === parseInt(params.id));

  if (!task) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>
      </div>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center gap-4">
            <p className="font-bold uppercase text-base leading-4">ID {task.id}</p>
            <Badge variant="secondary">{task.phase}</Badge>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {tagIcons[task.tag]}
            </div>
            <CardTitle className="font-headline text-2xl font-bold tracking-tight">{task.taskName}</CardTitle>
          </div>
          <CardDescription className="pt-2">{task.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <h3 className="font-medium">Status</h3>
            <Badge>{task.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateStaticParams() {
  return tasks.map((task) => ({
    id: task.id.toString(),
  }));
}
