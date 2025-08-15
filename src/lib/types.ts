export type TaskTag = 'waiting' | 'approved' | 'ai' | 'manual';
export type TaskPhase = 'Submission' | 'Marketing' | 'Proposal' | 'Binding' | 'Policy Check-In';

export interface Task {
  id: number;
  taskName: string;
  description: string;
  tag: TaskTag;
  phase: TaskPhase;
}
