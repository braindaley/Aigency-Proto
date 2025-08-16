
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaskTag, TaskPhase, TaskStatus } from '@/lib/types';

export default function NewTaskPage() {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tag, setTag] = useState<TaskTag | ''>('');
  const [phase, setPhase] = useState<TaskPhase | ''>('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const policyType = searchParams.get('policyType') || 'workers-comp';

  const handleAddTask = async () => {
    if (taskName.trim() && tag && phase) {
      try {
        await addDoc(collection(db, 'tasks'), {
          taskName: taskName.trim(),
          description: description.trim(),
          systemPrompt: systemPrompt.trim(),
          tag,
          phase,
          status: 'Upcoming' as TaskStatus,
          subtasks: [],
          policyType,
        });
        router.push(`/settings/task-settings/${policyType}`);
      } catch (error) {
        console.error('Error adding document: ', error);
      }
    }
  };

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
          <h1 className="text-3xl font-bold">Add New Task</h1>
          <p className="text-muted-foreground mt-2">
            Enter the details for the new task.
          </p>
      </div>
      
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskName">Task Name</Label>
              <Input
                id="taskName"
                placeholder="Enter task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="phase">Phase</Label>
              <Select onValueChange={(value: TaskPhase) => setPhase(value)} value={phase}>
                <SelectTrigger id="phase">
                  <SelectValue placeholder="Select a phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Submission">Submission</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Binding">Binding</SelectItem>
                  <SelectItem value="Policy Check-In">Policy Check-In</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Select onValueChange={(value: TaskTag) => setTag(value)} value={tag}>
                <SelectTrigger id="tag">
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {tag === 'ai' && (
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder="Enter system prompt for the AI"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => router.push(`/settings/task-settings/${policyType}`)}>
                Cancel
              </Button>
              <Button onClick={handleAddTask}>Save Task</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
