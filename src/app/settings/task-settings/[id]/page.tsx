
'use client';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import type { TaskTag, Subtask, Task } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { useState, useMemo, useEffect } from 'react';
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
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [tag, setTag] = useState<TaskTag>('manual');
  
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [initialState, setInitialState] = useState<any>({});

  useEffect(() => {
    if (!id) {
      notFound();
      return;
    }

    const fetchTaskAndAllTasks = async () => {
      try {
        // Fetch the specific task
        const taskDocRef = doc(db, 'tasks', id);
        const taskDoc = await getDoc(taskDocRef);

        if (!taskDoc.exists()) {
          notFound();
          return;
        }
        
        const taskData = { id: taskDoc.id, ...taskDoc.data() } as Task;
        setTask(taskData);
        setTaskName(taskData.taskName);
        setDescription(taskData.description);
        setSystemPrompt(taskData.systemPrompt || '');
        setSubtasks(taskData.subtasks || []);
        setTag(taskData.tag || 'manual');

        const currentState = {
          taskName: taskData.taskName,
          description: taskData.description,
          systemPrompt: taskData.systemPrompt || '',
          subtasks: taskData.subtasks || [],
          tag: taskData.tag || 'manual',
        };
        setInitialState(currentState);

        // Fetch all tasks for dependency options
        const tasksCollection = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollection);
        const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setAllTasks(tasksList);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskAndAllTasks();
  }, [id]);

  const dependencyOptions = useMemo(() => {
    if (!task) return [];
    return allTasks
      .filter((t) => t.id !== task.id)
      .map((t) => ({
        value: t.id,
        label: t.taskName,
      }));
  }, [allTasks, task]);

  const hasChanged = useMemo(() => {
    if (!task) return false;
    const currentState = {
      taskName,
      description,
      systemPrompt,
      subtasks,
      tag,
    };
    return JSON.stringify(initialState) !== JSON.stringify(currentState);
  }, [task, taskName, description, systemPrompt, subtasks, tag, initialState]);
  
  const handleAddSubtask = () => {
    if (newSubtask.trim() !== '') {
      setSubtasks([...subtasks, { id: Date.now(), text: newSubtask.trim() }]);
      setNewSubtask('');
    }
  };

  const handleDeleteSubtask = (id: number) => {
    setSubtasks(subtasks.filter((subtask) => subtask.id !== id));
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      const taskDocRef = doc(db, 'tasks', id);
      await updateDoc(taskDocRef, {
        taskName,
        description,
        systemPrompt,
        subtasks,
        tag,
      });
      const updatedInitialState = { taskName, description, systemPrompt, subtasks, tag };
      setInitialState(updatedInitialState);
      toast({
        title: "Task Saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save changes. Please try again.",
      });
    }
  };
  
  if (loading) {
    return (
       <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
        <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Card className="border-0 shadow-none">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                </div>
                <div className="pt-2 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
       </div>
    );
  }

  if (!task) {
    notFound();
    return null;
  }

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" asChild>
          <Link href={`/settings/task-settings/${task.policyType || 'workers-comp'}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to tasks
          </Link>
        </Button>
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
