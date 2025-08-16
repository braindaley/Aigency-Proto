
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInCalendarDays } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Renewal {
    id: number;
    type: string;
    date: Date | undefined;
}

interface Company {
  id: string;
  name: string;
  renewals?: Renewal[];
}

const policyTypes = [
    { value: 'workers-comp', label: "Worker's Comp" },
    { value: 'automotive', label: 'Automotive' },
    { value: 'general-liability', label: 'General Liability' },
    { value: 'property', label: 'Property' },
];

export default function CompanyTasksPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Renewal[]>([]);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          const companyData = { id: companyDoc.id, ...companyDoc.data() } as Company;
           if (companyData.renewals) {
            companyData.renewals = companyData.renewals.map(r => ({
              ...r,
              date: (r.date as any)?.toDate ? (r.date as any).toDate() : undefined,
            })).filter(r => r.date) as Renewal[];
          }
          setCompany(companyData);
        } else {
          setCompany(null);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  useEffect(() => {
    if (company?.renewals) {
      const today = new Date();
      const upcoming = company.renewals.filter(r => {
        if (!r.date) return false;
        const daysUntilRenewal = differenceInCalendarDays(r.date, today);
        return daysUntilRenewal >= 0 && daysUntilRenewal <= 120;
      });
      setUpcomingRenewals(upcoming);
    }
  }, [company]);

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href={`/companies/${companyId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Company
            </Link>
        </Button>
        {loading ? (
            <Skeleton className="h-9 w-1/2" />
        ) : (
            <h1 className="text-3xl font-bold">Tasks for {company?.name || 'Company'}</h1>
        )}
        <p className="text-muted-foreground mt-2">
            This is where you can view all the tasks for this specific company.
        </p>

        {upcomingRenewals.length > 0 && (
          <div className="mt-6 space-y-4">
            {upcomingRenewals.map(renewal => (
              <Alert key={renewal.id}>
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Start the renewal process for {policyTypes.find(p => p.value === renewal.type)?.label || renewal.type}</span>
                    <Button>Create tasks</Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>
      
      <Card className="border-0 shadow-none">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Task management functionality is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
