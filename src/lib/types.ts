export type TaskStatus = 'waiting' | 'approved' | 'ai' | 'manual';
export type TaskCategory = 'Submission' | 'Marketing' | 'Proposal' | 'Binding' | 'Policy Check-In';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory;
}
