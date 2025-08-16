
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CompanyTasksPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href={`/companies/${companyId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Company
            </Link>
        </Button>
        <h1 className="text-3xl font-bold">Tasks for Company {companyId}</h1>
        <p className="text-muted-foreground mt-2">
            This is where you will manage the tasks for this specific company.
        </p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Task management functionality is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
