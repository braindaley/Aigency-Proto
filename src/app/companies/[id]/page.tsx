
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Settings, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { format, addMonths, differenceInCalendarMonths } from "date-fns"
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { CompanyTask } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [timelineStartDate, setTimelineStartDate] = useState(new Date());
  
  const [attentionTasks, setAttentionTasks] = useState<CompanyTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<CompanyTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  const companyId = typeof id === 'string' ? id : '';

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setIsLoading(false);
        setTasksLoading(false);
        return;
      }
      setIsLoading(true);
      setTasksLoading(true);
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

      // Fetch tasks that need attention
      try {
        const tasksQuery = query(
          collection(db, 'companyTasks'), 
          where('companyId', '==', companyId),
          where('status', '==', 'Needs attention')
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksList = tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as CompanyTask[];

        tasksList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setAttentionTasks(tasksList);

        // Fetch upcoming tasks
        const upcomingQuery = query(
          collection(db, 'companyTasks'),
          where('companyId', '==', companyId),
          where('status', '==', 'Upcoming')
        );
        const upcomingSnapshot = await getDocs(upcomingQuery);
        const upcomingTasksList = upcomingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CompanyTask[];

        upcomingTasksList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setUpcomingTasks(upcomingTasksList);
      } catch (error) {
         console.error("Error fetching tasks:", error);
      } finally {
        setTasksLoading(false);
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
  const activeRenewalType = attentionTasks.length > 0
    ? policyTypes.find(p => p.value === attentionTasks[0].renewalType)?.label || attentionTasks[0].renewalType
    : null;

  // Helper function to get upcoming tasks for a specific renewal type
  const getUpcomingTasksForRenewalType = (renewalTypeLabel: string): CompanyTask[] => {
    const renewalTypeValue = policyTypes.find(p => p.label === renewalTypeLabel)?.value || renewalTypeLabel.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return upcomingTasks
      .filter(task => {
        const taskRenewalTypeLabel = policyTypes.find(p => p.value === task.renewalType)?.label || task.renewalType || 'Other';
        return taskRenewalTypeLabel === renewalTypeLabel;
      })
      .slice(0, 5); // First 5 upcoming tasks
  };

  // Get all renewal types that have either attention or upcoming tasks
  const getAllRenewalTypes = () => {
    const renewalTypes = new Set<string>();
    
    // Add renewal types from attention tasks
    attentionTasks.forEach(task => {
      const renewalType = policyTypes.find(p => p.value === task.renewalType)?.label || task.renewalType || 'Other';
      renewalTypes.add(renewalType);
    });
    
    // Add renewal types from upcoming tasks
    upcomingTasks.forEach(task => {
      const renewalType = policyTypes.find(p => p.value === task.renewalType)?.label || task.renewalType || 'Other';
      renewalTypes.add(renewalType);
    });
    
    return Array.from(renewalTypes);
  };

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8 pb-10">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href="/companies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Companies
            </Link>
        </Button>
        <div className="flex justify-between items-center">
            <div>
              <p className="mb-2 font-bold uppercase text-base leading-4 text-muted-foreground">ID {company.id}</p>
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
            </div>
            <Button asChild variant="ghost" className="h-8 w-8 rounded-full bg-muted p-0">
              <Link href={`/settings/companies/${company.id}`}>
                <Settings className="h-5 w-5" />
                <span className="sr-only">Company Settings</span>
              </Link>
            </Button>
        </div>
        
        <Timeline renewals={displayRenewals} startDate={timelineStartDate} />
      </div>
      
      {company.description && (
        <Card className="border-0 shadow-none">
          <CardContent className="p-0 pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Description</h3>
                <p className="text-muted-foreground">{company.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-12">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Button asChild variant="ghost" className="h-8 w-8 rounded-full bg-muted p-0">
            <Link href={`/companies/${company.id}/tasks`}>
              <Settings className="h-5 w-5" />
              <span className="sr-only">Task Settings</span>
            </Link>
          </Button>
        </div>
        
        <div className="mt-4">
          {tasksLoading ? (
            <p>Loading tasks...</p>
          ) : attentionTasks.length > 0 || upcomingTasks.length > 0 ? (
            <div className="space-y-8">
              {getAllRenewalTypes().map((renewalType) => {
                const attentionTasksForType = attentionTasks.filter(task => {
                  const taskRenewalType = policyTypes.find(p => p.value === task.renewalType)?.label || task.renewalType || 'Other';
                  return taskRenewalType === renewalType;
                });
                const upcomingTasksForType = getUpcomingTasksForRenewalType(renewalType);
                
                return (
                  <div key={renewalType} className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold">{renewalType}</h3>
                    
                    {attentionTasksForType.length > 0 && (
                      <>
                        <h4 className="text-base font-medium mb-4 mt-2">Needs Attention</h4>
                        <ul className="divide-y mb-6">
                          {attentionTasksForType.map((task) => (
                            <li key={task.id} className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  {task.tag === 'ai' ? (
                                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <User className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{task.taskName || 'Unnamed Task'}</p>
                                </div>
                                <Badge variant="secondary">{task.phase}</Badge>
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/companies/${companyId}/tasks/${task.id}`}>
                                  View
                                </Link>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    
                    {upcomingTasksForType.length > 0 && (
                      <>
                        <h4 className="text-base font-medium mb-4 mt-2 text-muted-foreground">Upcoming</h4>
                        <ul className="divide-y">
                          {upcomingTasksForType.map((task) => (
                            <li key={task.id} className="flex items-center justify-between p-4 opacity-75">
                              <div className="flex items-center gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  {task.tag === 'ai' ? (
                                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <User className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">{task.taskName || 'Unnamed Task'}</p>
                                </div>
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">{task.phase}</Badge>
                              </div>
                              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                                <Link href={`/companies/${companyId}/tasks/${task.id}`}>
                                  View
                                </Link>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg p-6 text-center text-muted-foreground">
              <p>No tasks currently need attention.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
