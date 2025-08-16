
'use client';
import { tasks } from '@/lib/data';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import type { TaskTag, Subtask } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TaskPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) {
    notFound();
  }

  const task = tasks.find((task) => task.id === parseInt(id));

  if (!task) {
    notFound();
  }

  const [taskName, setTaskName] = useState(task.taskName);
  const [description, setDescription] = useState(task.description);
  const [systemPrompt, setSystemPrompt] = useState(task.systemPrompt || '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [tag, setTag] = useState<TaskTag>(task.tag);

  const dependencyOptions = useMemo(() => tasks
    .filter((t) => t.id !== task.id)
    .map((t) => ({
      value: t.id.toString(),
      label: `${t.id} - ${t.taskName}`,
    })), [task.id]);

  const defaultDependency = useMemo(() => task.id > 1 ? [(task.id - 1).toString()] : [], [task.id]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(defaultDependency);

  const hasChanged = useMemo(() => {
    const taskNameChanged = taskName !== task.taskName;
    const tagChanged = tag !== task.tag;
    const dependenciesChanged = JSON.stringify(selectedDependencies.sort()) !== JSON.stringify(defaultDependency.sort());
    const descriptionChanged = description !== task.description;
    const systemPromptChanged = systemPrompt !== (task.systemPrompt || '');
    const subtasksChanged = JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || []);
    return taskNameChanged || dependenciesChanged || descriptionChanged || subtasksChanged || systemPromptChanged || tagChanged;
  }, [taskName, selectedDependencies, description, subtasks, systemPrompt, tag, task.taskName, task.tag, defaultDependency, task.description, task.subtasks, task.systemPrompt]);

  const handleAddSubtask = () => {
    if (newSubtask.trim() !== '') {
      setSubtasks([...subtasks, { id: Date.now(), text: newSubtask.trim() }]);
      setNewSubtask('');
    }
  };

  const handleDeleteSubtask = (id: number) => {
    setSubtasks(subtasks.filter((subtask) => subtask.id !== id));
  };

  const handleSave = () => {
    console.log('Saving task...');
  };

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8">
        <Link href="/settings/task-settings/workers-comp" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>
        <Button onClick={handleSave} disabled={!hasChanged}>
          Save changes
        </Button>
      </div>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center gap-4">
            <p className="font-bold uppercase text-base leading-4">ID {task.id}</p>
            <Badge variant="secondary">{task.phase}</Badge>
          </div>
          <div className="pt-2">
              <Label htmlFor="taskName">Task Name</Label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter a task name"
                className="mt-2"
              />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskType">Task Type</Label>
            <Select onValueChange={(value: TaskTag) => setTag(value)} value={tag}>
                <SelectTrigger id="taskType">
                    <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                </SelectContent>
            </Select>
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for the task."
            />
          </div>
          {tag === 'ai' && (
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System prompt</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter a system prompt for the AI task."
                className="min-h-[150px]"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
