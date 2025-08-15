import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold">Welcome</h1>
      <p className="text-muted-foreground mt-2 mb-8">
        The task management pages have been moved.
      </p>
      <Button asChild>
        <Link href="/settings/tasks">Go to Tasks</Link>
      </Button>
    </div>
  );
}
