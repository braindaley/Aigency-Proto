import { tasks } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl font-bold tracking-tight">{task.taskName}</CardTitle>
          <CardDescription>{task.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <h3 className="font-medium">ID</h3>
            <p className="text-muted-foreground">{task.id}</p>
          </div>
          <div>
            <h3 className="font-medium">Phase</h3>
            <p className="text-muted-foreground">{task.phase}</p>
          </div>
          <div>
            <h3 className="font-medium">Tag</h3>
            <Badge variant="outline">{task.tag}</Badge>
          </div>
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
