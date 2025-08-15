import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Welcome</h1>
      <p className="mb-8">The task management pages have been moved.</p>
      <Button asChild>
        <Link href="/settings/tasks">Go to Tasks</Link>
      </Button>
    </div>
  );
}
