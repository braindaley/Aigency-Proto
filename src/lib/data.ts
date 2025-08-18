import type { Task } from '@/lib/types';

export const tasks: Task[] = [
  { id: '1', phase: 'Submission', taskName: 'ACORD 125 – Commercial Insurance Application', tag: 'manual', status: 'Upcoming', description: 'Ensure the ACORD 125 is fully completed with accurate business details; double-check for missing fields to avoid carrier delays.' },
  { id: '2', phase: 'Submission', taskName: 'ACORD 130 – Request payroll by classification', tag: 'manual', status: 'Upcoming', description: 'Request payroll data broken down by classification codes; confirm accuracy to prevent misrating.' },
  { id: '3', phase: 'Submission', taskName: 'Research public info (OSHA data, company site)', tag: 'ai', status: 'Upcoming', description: 'Use OSHA databases and company sites to enrich submissions with safety and compliance data.' },
  { id: '4', phase: 'Submission', taskName: 'Write narrative', tag: 'ai', status: 'Upcoming', description: 'Draft a clear narrative that explains operations, risk controls, and strengths.' },
  { id: '5', phase: 'Marketing', taskName: 'Draft custom marketing emails', tag: 'ai', status: 'Upcoming', description: 'Personalize marketing emails with industry insights for better underwriter engagement.' },
  { id: '6', phase: 'Proposal', taskName: 'Generate comparison sheet', tag: 'ai', status: 'Upcoming', description: 'Generate a side-by-side comparison sheet; keep it simple and client-friendly.' },
  { id: '7', phase: 'Binding', taskName: 'Generate COI', tag: 'ai', status: 'Upcoming', description: 'Generate certificates of insurance (COI) accurately; confirm correct entities and limits are listed.' },
];