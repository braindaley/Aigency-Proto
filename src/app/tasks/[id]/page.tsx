import Link from 'next/link';
import { notFound } from 'next/navigation';
import { tasks } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ThumbsUp, Sparkles, User } from 'lucide-react';
import type { Task, TaskTag } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const tagIcons: Record<TaskTag, React.ReactNode> = {
  waiting: <Clock className="h-4 w-4" />,
  approved: <ThumbsUp className="h-4 w-4" />,
  ai: <Sparkles className="h-4 w-4" />,
  manual: <User className="h-4 w-4" />,
};

export async function generateStaticParams() {
  return tasks.map((task: Task) => ({
    id: task.id.toString(),
  }));
}

export default function TaskPage({ params }: { params: { id:string } }) {
  const task = tasks.find((t: Task) => t.id.toString() === params.id);

  if (!task) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="w-full">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Tasks
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-headline">{task.taskName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold mb-2">ID</h3>
              <p className="text-muted-foreground">{task.id}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Phase</h3>
              <p className="text-muted-foreground">{task.phase}</p>
            </div>
             <div>
              <h3 className="font-semibold mb-2">Tag</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                   {tagIcons[task.tag]}
                  <span className="ml-2">{task.tag}</span>
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{task.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
