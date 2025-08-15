export type TaskStatus = 'waiting' | 'approved' | 'ai' | 'manual';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
}
