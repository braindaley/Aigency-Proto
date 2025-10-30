
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Settings, FileText, Database, Mail, ArrowRight, Package, Megaphone, FileBarChart, CheckCircle, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { format, addMonths, differenceInCalendarMonths } from "date-fns"
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  renewals?: Renewal[];
}

interface Renewal {
    id: number;
    type: string;
    date: Date | undefined;
}

const policyTypes = [
    { value: 'workers-comp', label: "Worker's Comp" },
    { value: 'automotive', label: 'Automotive' },
    { value: 'general-liability', label: 'General Liability' },
    { value: 'property', label: 'Property' },
];

const policyTypeAbbreviations: { [key: string]: string } = {
    'workers-comp': 'WC',
    'automotive': 'Auto',
    'general-liability': 'GL',
    'property': 'Prop',
};

const Timeline = ({ renewals, startDate }: { renewals: Renewal[], startDate: Date }) => {
    const [months, setMonths] = useState<Date[]>([]);
  
    useEffect(() => {
      const getMonths = () => {
        const futureMonths = [];
        for (let i = 0; i < 15; i++) {
          futureMonths.push(addMonths(startDate, i));
        }
        return futureMonths;
      };
      setMonths(getMonths());
    }, [startDate]);

    const renewalsByMonth: { [key: number]: Renewal[] } = {};
    renewals.forEach(renewal => {
        if (renewal.date) {
            const monthIndex = differenceInCalendarMonths(renewal.date, startDate);
            if (monthIndex >= 0 && monthIndex < 15) {
                if (!renewalsByMonth[monthIndex]) {
                    renewalsByMonth[monthIndex] = [];
                }
                renewalsByMonth[monthIndex].push(renewal);
            }
        }
    });
  
    return (
      <div className="w-full mt-8 relative">
        <div className="flex justify-between text-sm text-muted-foreground mb-2" style={{ fontSize: '14px' }}>
          {months.map((month, index) => (
            <span key={index} className="flex-1 text-center">{format(month, 'MMM')}</span>
          ))}
        </div>
        <div className="w-full bg-muted rounded-full" style={{ height: '10px', borderRadius: '40px' }} />
        <div className="absolute top-full w-full mt-2">
            {Object.entries(renewalsByMonth).map(([monthIndex, monthRenewals]) => (
                <div 
                    key={monthIndex} 
                    className="absolute flex flex-col items-center"
                    style={{ 
                        left: `calc(${(parseInt(monthIndex) / 15) * 100}% + ${(100 / 15 / 2)}%)`, 
                        transform: 'translateX(-50%)' 
                    }}
                >
                    {monthRenewals.map((renewal) => (
                         <div 
                            key={renewal.id} 
                            className="text-xs font-medium text-gray-600"
                            style={{
                                display: 'flex',
                                padding: '2px 10px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: '12px',
                                backgroundColor: '#f0f0f0', // light grey
                                marginBottom: '4px'
                            }}
                        >
                            {policyTypeAbbreviations[renewal.type] || renewal.type}
                        </div>
                    ))}
                </div>
            ))}
        </div>
      </div>
    );
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [timelineStartDate, setTimelineStartDate] = useState(new Date());

  const companyId = typeof id === 'string' ? id : '';

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Fetch company details
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
          setRenewals(companyData.renewals || []);
        } else {
          setCompany(null);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);


  if (isLoading) {
    return (
      <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
        <p>Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12 text-center">
         <h1 className="text-3xl font-bold mb-4">Company Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The company you are looking for does not exist.
        </p>
        <Button asChild>
          <Link href="/companies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </Button>
      </div>
    );
  }

  const displayRenewals = company.renewals || [];

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8 pb-10">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          {company.website && (
            <Button asChild variant="outline" size="sm">
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {company.description && (
          <div className="mt-6">
            <p className="text-muted-foreground">{company.description}</p>
          </div>
        )}

        <div className="flex gap-2 mb-8" style={{ marginTop: '12px' }}>
          <Button asChild variant="outline" size="sm">
            <Link href={`/companies/${company.id}/documents`}>
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/companies/${company.id}/artifacts`}>
              <Database className="h-4 w-4 mr-2" />
              Artifacts
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Mail className="h-4 w-4 mr-2" />
            Emails
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/companies/${company.id}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>

        <Timeline renewals={displayRenewals} startDate={timelineStartDate} />

        {/* Policy Workflow Blocks */}
        <div className="mt-12 space-y-8">
          {displayRenewals.map((renewal) => (
            <Card key={renewal.id}>
              <CardHeader>
                <CardTitle>
                  {policyTypes.find(pt => pt.value === renewal.type)?.label || renewal.type}
                  {renewal.date && ` - Renewal: ${format(renewal.date, 'MMM d, yyyy')}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* First Row: Submission -> Marketing -> Proposal */}
                  <div className="flex items-start gap-6">
                    {/* Submission */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Package className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Submission</h3>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button asChild variant="outline" size="sm" className="whitespace-normal text-left justify-start">
                          <Link href={`/companies/${company.id}/renewals/${renewal.type}/build-package`}>
                            Build package
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Marketing */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Megaphone className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm text-muted-foreground">Marketing</h3>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                          Identify carriers
                        </Button>
                        <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                          Track submissions
                        </Button>
                      </div>
                    </div>

                    {/* Proposal */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileBarChart className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm text-muted-foreground">Proposal</h3>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                          Compare quotes
                        </Button>
                        <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                          Build proposal
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Second Row: Binding -> Policy Check */}
                  <div className="flex items-start gap-6">
                    {/* Binding */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm text-muted-foreground">Binding</h3>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                          Bind with carrier
                        </Button>
                        <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                          Issue client docs
                        </Button>
                      </div>
                    </div>

                    {/* Policy checking */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Policy Check</h3>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button asChild variant="outline" size="sm" className="whitespace-normal text-left justify-start">
                          <Link href={`/companies/${company.id}/compare-policy`}>
                            Compare policy
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Empty space to balance the layout */}
                    <div className="flex-1 min-w-[140px]"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
