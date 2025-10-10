
import type { Timestamp } from 'firebase/firestore';

export type TaskTag = 'waiting' | 'approved' | 'ai' | 'manual';
export type TaskPhase = 'Submission' | 'Marketing' | 'Proposal' | 'Binding' | 'Policy Check-In';
export type TaskStatus = 'Needs attention' | 'Upcoming' | 'Complete';

export interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

export interface PredefinedButton {
  label: string;
  action: string;
}

export interface Task {
  id: string;
  taskName: string;
  description: string;
  tag: TaskTag;
  phase: TaskPhase;
  status: TaskStatus;
  dependencies?: string[];
  showDependencyArtifacts?: boolean; // Show artifacts from dependency tasks for review
  policyType?: string;
  subtasks?: Subtask[];
  systemPrompt?: string;
  testCriteria?: string;
  templateId?: string | number;
  sortOrder?: number;
  predefinedButtons?: PredefinedButton[];
}

export interface CompanyTask extends Task {
    companyId: string;
    renewalDate: Timestamp;
    renewalType: string;
}
