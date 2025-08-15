
'use client';
import { tasks } from '@/lib/data';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Clock, ThumbsUp, Sparkles, User } from 'lucide-react';
import type { TaskTag } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { useState } from 'react';

const tagIcons: Record<TaskTag, React.ReactNode> = {
  waiting: <Clock className="h-8 w-8 text-muted-foreground" />,
  approved: <ThumbsUp className="h-8 w-8 text-muted-foreground" />,
  ai: <Sparkles className="h-8 w-8 text-muted-foreground" />,
  manual: <User className="h-8 w-8 text-muted-foreground" />,
};

export default function TaskPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const task = tasks.find((task) => task.id === parseInt(id));

  if (!task) {
    notFound();
  }

  const dependencyOptions = tasks
    .filter((t) => t.id !== task.id)
    .map((t) => ({
      value: t.id.toString(),
      label: `${t.id} - ${t.taskName}`,
    }));

  const defaultDependency = task.id > 1 ? [(task.id - 1).toString()] : [];
  
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(defaultDependency);

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
        <CardContent>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Dependencies</h3>
            <Combobox
              options={dependencyOptions}
              selected={selectedDependencies}
              onChange={setSelectedDependencies}
              placeholder="Select dependencies..."
              searchPlaceholder="Search dependencies..."
              noResultsText="No dependencies found."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
