'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ComparePolicyWorkflow } from '@/components/ComparePolicyWorkflow';

interface Company {
  id: string;
  name: string;
}

export default function ComparePolicyPage() {
  const { id } = useParams();
  const companyId = typeof id === 'string' ? id : '';
  const [company, setCompany] = useState<Company | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeWorkflow = async () => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch company details
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
        }

        // Check if a compare policy workflow exists
        const workflowsRef = collection(db, 'comparePolicyWorkflows');
        const workflowQuery = query(
          workflowsRef,
          where('companyId', '==', companyId)
        );
        const workflowSnapshot = await getDocs(workflowQuery);

        if (!workflowSnapshot.empty) {
          // Use existing workflow
          setWorkflowId(workflowSnapshot.docs[0].id);
        } else {
          // Create new workflow
          const response = await fetch('/api/compare-policy/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId }),
          });

          if (response.ok) {
            const data = await response.json();
            setWorkflowId(data.workflowId);
          }
        }
      } catch (error) {
        console.error('Error initializing workflow:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWorkflow();
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12">
        <p>Loading...</p>
      </div>
    );
  }

  if (!company || !workflowId) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12">
        <p>Error loading workflow</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link href={`/companies/${companyId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {company.name}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Compare Policy Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload your proposal/binder and issued policy to identify discrepancies and compliance issues.
        </p>
      </div>

      <ComparePolicyWorkflow
        workflowId={workflowId}
        companyId={companyId}
      />
    </div>
  );
}
