
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, User, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInCalendarDays, format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Task, TaskStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

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

interface CompanyTask extends Task {
    companyId: string;
    renewalDate: Timestamp;
    renewalType: string;
}

const policyTypes = [
    { value: 'workers-comp', label: "Worker's Comp" },
    { value: 'automotive', label: 'Automotive' },
    { value: 'general-liability', label: 'General Liability' },
    { value: 'property', label: 'Property' },
];

const STATUS_ORDER: TaskStatus[] = ['Needs attention', 'Upcoming', 'Complete'];

export default function CompanyTasksPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Renewal[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, CompanyTask[]>>({
    'Needs attention': [],
    'Upcoming': [],
    'Complete': [],
  });
  const [error, setError] = useState<string | null>(null);
  const [generatedRenewals, setGeneratedRenewals] = useState<string[]>([]);

  const fetchCompanyAndTasks = async () => {
      if (!companyId) {
        setLoading(false);
        setTasksLoading(false);
        return;
      }
      setLoading(true);
      setTasksLoading(true);
      try {
        // Fetch company data
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

      // Fetch company tasks
      await fetchCompanyTasks();
  };

  const fetchCompanyTasks = async () => {
    setTasksLoading(true);
    setError(null);
    try {
        const tasksCollection = collection(db, 'companyTasks');
        const q = query(tasksCollection, where('companyId', '==', companyId));
        const tasksSnapshot = await getDocs(q);
        
        const tasksList = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CompanyTask[];

        tasksList.sort((a, b) => {
            const idA = parseInt(String(a.id), 10);
            const idB = parseInt(String(b.id), 10);
            return idA - idB;
        });

        // Update generated renewals state
        const generated = [...new Set(tasksList.map(task => task.renewalType))];
        setGeneratedRenewals(generated);

        const groupedTasks = tasksList.reduce((acc, task) => {
          const status: TaskStatus = task.status && STATUS_ORDER.includes(task.status) ? task.status : 'Upcoming';
          if (!acc[status]) {
            acc[status] = [];
          }
          acc[status].push(task);
          return acc;
        }, {} as Record<TaskStatus, CompanyTask[]>);

        const finalGroupedTasks = STATUS_ORDER.reduce((acc, status) => {
            acc[status] = groupedTasks[status] || [];
            return acc;
        }, {} as Record<TaskStatus, CompanyTask[]>);

        setTasksByStatus(finalGroupedTasks);

      } catch (err) {
        console.error("Error fetching tasks: ", err);
        setError('Failed to load tasks. Please try again later.');
      } finally {
        setTasksLoading(false);
      }
  };


  useEffect(() => {
    fetchCompanyAndTasks();
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

  const handleCreateTasks = async (renewal: Renewal) => {
    if (!companyId || !renewal.date) return;

    const templatesQuery = query(collection(db, 'tasks'), where('policyType', '==', renewal.type));
    const templatesSnapshot = await getDocs(templatesQuery);

    if (templatesSnapshot.empty) {
        console.log(`No task templates found for policy type: ${renewal.type}`);
        return;
    }

    const batch = writeBatch(db);
    const companyTasksCollection = collection(db, 'companyTasks');
    
    const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Task }));
    
    templates.sort((a, b) => {
        const idA = parseInt(String(a.id), 10);
        const idB = parseInt(String(b.id), 10);
        if (!isNaN(idA) && !isNaN(idB)) {
          return idA - idB;
        }
        return String(a.id).localeCompare(String(b.id));
    });

    templates.forEach((templateData, index) => {
      const newCompanyTaskRef = doc(companyTasksCollection);
      const newCompanyTask = {
        ...templateData,
        templateId: templateData.id,
        companyId: companyId,
        renewalType: renewal.type,
        renewalDate: Timestamp.fromDate(renewal.date!),
        status: (index === 0 ? 'Needs attention' : 'Upcoming') as const,
      };
      batch.set(newCompanyTaskRef, newCompanyTask);
    });

    try {
        await batch.commit();
        console.log('Successfully created tasks for renewal:', renewal.type);
        await fetchCompanyTasks(); 
    } catch (error) {
        console.error('Error creating company tasks:', error);
    }
  };

  const handleDeleteTasks = async (renewalType: string) => {
    if (!companyId) return;

    try {
      const q = query(
        collection(db, 'companyTasks'),
        where('companyId', '==', companyId),
        where('renewalType', '==', renewalType)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('No tasks to delete.');
        return;
      }

      const batch = writeBatch(db);
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Successfully deleted ${snapshot.size} tasks for renewal: ${renewalType}`);
      await fetchCompanyTasks();
    } catch (error) {
      console.error('Error deleting tasks:', error);
    }
  };

  const renderTaskList = (tasks: CompanyTask[]) => {
    if (tasks.length === 0) {
      return <p className="text-sm text-muted-foreground px-4 py-4 text-center">No tasks in this category.</p>;
    }
    return (
      <ul className="border-t-0">
        {tasks.map((task) => (
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
    );
  };

  const allTasksCount = STATUS_ORDER.reduce((sum, status) => sum + (tasksByStatus[status]?.length || 0), 0);
  const activeRenewal = upcomingRenewals.find(r => generatedRenewals.includes(r.type));

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
            <div className="space-y-2">
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
            </div>
        ) : (
            <div>
                <h1 className="text-3xl font-bold">Tasks for {company?.name || 'Company'}</h1>
                <p className="text-muted-foreground mt-2">
                    This is where you can view all the tasks for this specific company.
                </p>
                {activeRenewal && activeRenewal.date && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold">
                        {policyTypes.find(p => p.value === activeRenewal.type)?.label || activeRenewal.type}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Renewal Date: {format(activeRenewal.date, 'PPP')}
                    </p>
                </div>
                )}
            </div>
        )}

        {upcomingRenewals.length > 0 && (
          <div className="mt-6 space-y-4">
            {upcomingRenewals.map(renewal => (
              <Alert key={renewal.id}>
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Start the renewal process for {policyTypes.find(p => p.value === renewal.type)?.label || renewal.type}</span>
                    <div className="flex items-center gap-2">
                      {generatedRenewals.includes(renewal.type) ? (
                        <>
                         <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteTasks(renewal.type)}
                            aria-label={`Delete ${renewal.type} tasks`}
                          >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                         <Button disabled>
                           Tasks Created
                         </Button>
                        </>
                      ) : (
                        <Button onClick={() => handleCreateTasks(renewal)}>
                           Create tasks
                        </Button>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>
      
      <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            {tasksLoading ? (
                <div className="space-y-4 p-6">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-3/4" />
                </div>
            ) : error ? (
                <p className="text-destructive p-6">{error}</p>
            ) : allTasksCount === 0 ? (
                <p className="text-muted-foreground text-center p-6">No tasks have been created for this company yet.</p>
            ) : (
                <Accordion type="multiple" defaultValue={STATUS_ORDER} className="w-full">
                    {STATUS_ORDER.map(status => (
                        tasksByStatus[status] && tasksByStatus[status].length > 0 && (
                            <AccordionItem value={status} key={status} className="border-b-0">
                                <AccordionTrigger className="px-6 text-base font-semibold hover:no-underline">
                                    <h3>{status} ({tasksByStatus[status].length})</h3>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                    {renderTaskList(tasksByStatus[status])}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    ))}
                </Accordion>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
