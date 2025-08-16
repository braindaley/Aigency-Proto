export type TaskTag = 'waiting' | 'approved' | 'ai' | 'manual';
export type TaskPhase = 'Submission' | 'Marketing' | 'Proposal' | 'Binding' | 'Policy Check-In';
export type TaskStatus = 'Needs attention' | 'Upcoming' | 'Complete';

export interface Subtask {
  id: string;
  text: string;
}

export interface Task {
  id: string;
  taskName: string;
  description: string;
  tag: TaskTag;
  phase: TaskPhase;
  status: TaskStatus;
  subtasks?: Subtask[];
  systemPrompt?: string;
}
