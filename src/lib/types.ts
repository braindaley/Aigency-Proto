
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

// Email Submission Types
export type SubmissionStatus = 'draft' | 'ready' | 'sending' | 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'replied';

export interface SubmissionAttachment {
  artifactId?: string; // Link to artifact in artifacts collection
  name: string;
  url: string; // Firebase Storage URL or external URL
  size?: number;
  type?: string; // MIME type
}

export interface SubmissionReply {
  from: string;
  fromName?: string;
  receivedAt: Timestamp;
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: SubmissionAttachment[];
}

export interface EmailTracking {
  opens: number;
  lastOpenedAt?: Timestamp;
  clicks: number;
  lastClickedAt?: Timestamp;
  deliveredAt?: Timestamp;
  bouncedAt?: Timestamp;
  bounceReason?: string;
}

export interface Submission {
  id: string;
  companyId: string;
  taskId: string;
  taskName: string;

  // Carrier Information
  carrierName: string;
  carrierEmail: string;
  carrierContact?: string; // Contact person name

  // Email Content
  subject: string;
  body: string; // Email body (markdown or text)
  bodyHtml?: string; // Rendered HTML version
  attachments: SubmissionAttachment[];

  // Status & Tracking
  status: SubmissionStatus;
  sentAt?: Timestamp;
  sentBy?: string; // User ID who sent the email
  emailId?: string; // Email service provider ID (Resend, SendGrid, etc.)
  tracking?: EmailTracking;

  // Replies & Conversation
  replies: SubmissionReply[];
  lastReplyAt?: Timestamp;

  // Metadata
  notes?: string; // Internal notes
  priority?: 'low' | 'normal' | 'high';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}
