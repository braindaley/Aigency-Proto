import Link from 'next/link';
import { notFound } from 'next/navigation';
import { tasks } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Task } from '@/lib/types';

export async function generateStaticParams() {
  return tasks.map((task: Task) => ({
    id: task.id,
  }));
}

export default function TaskPage({ params }: { params: { id:string } }) {
  const task = tasks.find((t: Task) => t.id === params.id);

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
            <CardTitle className="text-2xl font-bold font-headline">{task.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground">{task.description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
