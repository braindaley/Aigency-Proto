'use client';
import { tasks } from '@/lib/data';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Clock, ThumbsUp, Sparkles, User, Trash2, Plus } from 'lucide-react';
import type { TaskTag, Subtask } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const [description, setDescription] = useState(task.description);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');

  const dependencyOptions = useMemo(() => tasks
    .filter((t) => t.id !== task.id)
    .map((t) => ({
      value: t.id.toString(),
      label: `${t.id} - ${t.taskName}`,
    })), [task.id]);

  const defaultDependency = useMemo(() => task.id > 1 ? [(task.id - 1).toString()] : [], [task.id]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(defaultDependency);

  const hasChanged = useMemo(() => {
    const dependenciesChanged = JSON.stringify(selectedDependencies.sort()) !== JSON.stringify(defaultDependency.sort());
    const descriptionChanged = description !== task.description;
    const subtasksChanged = JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || []);
    return dependenciesChanged || descriptionChanged || subtasksChanged;
  }, [selectedDependencies, description, subtasks, defaultDependency, task.description, task.subtasks]);

  const handleAddSubtask = () => {
    if (newSubtask.trim() !== '') {
      setSubtasks([...subtasks, { id: Date.now(), text: newSubtask.trim() }]);
      setNewSubtask('');
    }
  };

  const handleDeleteSubtask = (id: number) => {
    setSubtasks(subtasks.filter((subtask) => subtask.id !== id));
  };

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8">
        <Link href="/settings/tasks" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>
        <Button disabled={!hasChanged}>
          Save changes
        </Button>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dependencies">Dependencies</Label>
            <Combobox
              options={dependencyOptions}
              selected={selectedDependencies}
              onChange={setSelectedDependencies}
              placeholder="Select dependencies..."
              searchPlaceholder="Search dependencies..."
              noResultsText="No dependencies found."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for the task."
            />
          </div>
          <div className="space-y-2">
            <Label>Sub-tasks</Label>
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2">
                  <Input value={subtask.text} readOnly className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    aria-label="Delete sub-task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a new sub-task"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              />
              <Button onClick={handleAddSubtask} aria-label="Add sub-task">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
