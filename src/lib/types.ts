export type TaskStatus = 'waiting' | 'approved' | 'ai';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
}
