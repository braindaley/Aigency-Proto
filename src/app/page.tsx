import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-4xl font-bold mb-4 text-left">Welcome</h1>
      <p className="mb-8 text-left text-muted-foreground">
        The task management pages have been moved.
      </p>
      <Button asChild>
        <Link href="/settings/tasks">Go to Tasks</Link>
      </Button>
    </div>
  );
}
