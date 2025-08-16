
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInCalendarDays } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Task, TaskPhase } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

const PHASES_ORDER: TaskPhase[] = ['Submission', 'Marketing', 'Proposal', 'Binding', 'Policy Check-In'];

export default function CompanyTasksPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Renewal[]>([]);
  const [tasksByPhase, setTasksByPhase] = useState<Record<TaskPhase, CompanyTask[]>>({
    'Submission': [],
    'Marketing': [],
    'Proposal': [],
    'Binding': [],
    'Policy Check-In': [],
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

        // Update generated renewals state
        const generated = [...new Set(tasksList.map(task => task.renewalType))];
        setGeneratedRenewals(generated);

        const groupedTasks = tasksList.reduce((acc, task) => {
          const phase: TaskPhase = task.phase && PHASES_ORDER.includes(task.phase) ? task.phase : 'Submission';
          if (!acc[phase]) {
            acc[phase] = [];
          }
          acc[phase].push(task);
          return acc;
        }, {} as Record<TaskPhase, CompanyTask[]>);

        const finalGroupedTasks = PHASES_ORDER.reduce((acc, phase) => {
            acc[phase] = groupedTasks[phase] || [];
            return acc;
        }, {} as Record<TaskPhase, CompanyTask[]>);

        setTasksByPhase(finalGroupedTasks);

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

    // 1. Query for template tasks
    const templatesQuery = query(collection(db, 'tasks'), where('policyType', '==', renewal.type));
    const templatesSnapshot = await getDocs(templatesQuery);

    if (templatesSnapshot.empty) {
        console.log(`No task templates found for policy type: ${renewal.type}`);
        // Optionally, show a toast notification to the user
        return;
    }

    // 2. Create a batch write
    const batch = writeBatch(db);
    const companyTasksCollection = collection(db, 'companyTasks');

    templatesSnapshot.forEach(templateDoc => {
        const templateData = templateDoc.data() as Task;
        const newCompanyTaskRef = doc(companyTasksCollection); // Create a new doc with a unique ID

        const newCompanyTask = {
            ...templateData,
            companyId: companyId,
            renewalType: renewal.type,
            renewalDate: Timestamp.fromDate(renewal.date!),
            status: 'Upcoming' as const,
        };
        
        batch.set(newCompanyTaskRef, newCompanyTask);
    });

    // 3. Commit the batch
    try {
        await batch.commit();
        console.log('Successfully created tasks for renewal:', renewal.type);
        // 4. Refresh the tasks list on the page
        await fetchCompanyTasks(); 
    } catch (error) {
        console.error('Error creating company tasks:', error);
        // Optionally, show an error toast
    }
  };

  const renderTaskList = (tasks: CompanyTask[]) => {
    if (tasks.length === 0) {
      return <p className="text-sm text-muted-foreground px-4 py-4 text-center">No tasks in this phase.</p>;
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

  const allTasksCount = PHASES_ORDER.reduce((sum, phase) => sum + tasksByPhase[phase].length, 0);

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
                    <Button 
                      onClick={() => handleCreateTasks(renewal)}
                      disabled={generatedRenewals.includes(renewal.type)}
                    >
                      {generatedRenewals.includes(renewal.type) ? 'Tasks Created' : 'Create tasks'}
                    </Button>
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
                <Accordion type="multiple" defaultValue={PHASES_ORDER} className="w-full">
                    {PHASES_ORDER.map(phase => (
                        <AccordionItem value={phase} key={phase} className="border-b-0">
                            <AccordionTrigger className="px-6 text-base font-semibold hover:no-underline">
                                <h2>{phase} ({tasksByPhase[phase].length})</h2>
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                                {renderTaskList(tasksByPhase[phase])}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
