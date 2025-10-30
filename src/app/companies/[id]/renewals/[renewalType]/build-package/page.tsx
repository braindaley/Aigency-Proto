'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BuildPackageWorkflow } from '@/components/BuildPackageWorkflow';

export default function BuildPackagePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const renewalType = Array.isArray(params.renewalType) ? params.renewalType[0] : params.renewalType;
  const [loading, setLoading] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    const initializeWorkflow = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/build-package/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId, renewalType }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize workflow');
        }

        const data = await response.json();
        setWorkflowId(data.workflowId);
      } catch (error) {
        console.error('Error initializing workflow:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId && renewalType) {
      initializeWorkflow();
    }
  }, [companyId, renewalType]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/companies/${companyId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Company
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Build Submission Package</h1>
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!workflowId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/companies/${companyId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Company
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Build Submission Package</h1>
        </div>
        <div>Failed to initialize workflow. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/companies/${companyId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Build Submission Package</h1>
        <p className="text-muted-foreground mt-2">
          Complete your Workers' Compensation submission package
        </p>
      </div>

      <BuildPackageWorkflow
        workflowId={workflowId}
        companyId={companyId}
        renewalType={renewalType}
      />
    </div>
  );
}
