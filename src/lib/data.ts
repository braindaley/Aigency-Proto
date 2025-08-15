import type { Task } from '@/lib/types';

export const tasks: Task[] = [
  { id: '1', title: 'Setup Project Structure', description: 'Initialize the Next.js project and organize folders for components, lib, and app routes to ensure a scalable architecture.', status: 'approved' },
  { id: '2', title: 'Create UI Components', description: 'Build a library of reusable UI components for cards, buttons, and layouts using shadcn/ui to maintain a consistent design system.', status: 'approved' },
  { id: '3', title: 'Implement Task Routing', description: 'Configure dynamic routes for individual task pages using the Next.js App Router, allowing each task to have a unique URL.', status: 'waiting' },
  { id: '4', title: 'Integrate Mock Data', description: 'Create and import a temporary data source for tasks to populate the application and facilitate UI development before connecting to a live database.', status: 'waiting' },
  { id: '5', title: 'Apply Global Styles', description: 'Implement the specified color scheme, typography, and layout rules in the global CSS file to ensure a consistent and clean visual identity.', status: 'ai' },
  { id: '6', title: 'Add Page Transitions', description: 'Incorporate subtle animations and transitions for navigation between task list and detail pages to enhance the user experience.', status: 'ai' },
];
