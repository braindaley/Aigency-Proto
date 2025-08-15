import type { Task } from '@/lib/types';

export const tasks: Task[] = [
  {
    id: 1,
    taskName: 'ACORD 125 – Commercial Insurance Application',
    description: 'Complete the ACORD 125 form for commercial insurance applications.',
    tag: 'manual',
    phase: 'Submission',
  },
  {
    id: 2,
    taskName: 'Research public info (OSHA data, company site)',
    description: 'Use AI to research public information about the company, including OSHA data and their official website.',
    tag: 'ai',
    phase: 'Submission',
  },
  {
    id: 3,
    taskName: 'Draft custom marketing emails',
    description: 'Use AI to draft personalized marketing emails to send to suitable carriers.',
    tag: 'ai',
    phase: 'Marketing',
  },
  {
    id: 4,
    taskName: 'Ingest quotes',
    description: 'Use AI to ingest and process quotes received from various carriers.',
    tag: 'ai',
    phase: 'Proposal',
  },
  {
    id: 5,
    taskName: 'Obtain binding confirmation',
    description: 'Manually obtain binding confirmation from the selected carrier.',
    tag: 'manual',
    phase: 'Binding',
  },
  {
    id: 6,
    taskName: 'Compare issued policy vs binder',
    description: 'Use AI to compare the issued policy with the binder to check for discrepancies.',
    tag: 'ai',
    phase: 'Policy Check-In',
  },
];
