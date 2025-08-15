import Link from 'next/link';
import { tasks } from '@/lib/data';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 font-headline">
          TaskMapper
        </h1>
        <p className="text-lg text-muted-foreground">
          A clear path to your project's completion.
        </p>
      </header>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Link href={`/tasks/${task.id}`} key={task.id} className="group block">
            <Card className="h-full transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{task.title}</span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out group-hover:translate-x-1 group-hover:text-primary" />
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
