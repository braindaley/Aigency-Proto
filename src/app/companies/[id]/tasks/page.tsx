
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, User, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInCalendarDays, format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Task, TaskStatus, CompanyTask } from '@/lib/types';
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

const policyTypes = [
    { value: 'workers-comp', label: "Worker's Comp" },
    { value: 'automotive', label: 'Automotive' },
    { value: 'general-liability', label: 'General Liability' },
    { value: 'property', label: 'Property' },
];

const STATUS_ORDER: TaskStatus[] = ['Needs attention', 'Upcoming', 'Complete'];

export default function CompanyTasksPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const renewalTypeFilter = searchParams.get('renewalType');
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
        
        let tasksList = tasksSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as CompanyTask[];

        // Filter by renewalType if specified in query params
        if (renewalTypeFilter) {
          tasksList = tasksList.filter(task => task.renewalType === renewalTypeFilter);
        }

        tasksList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // Update generated renewals state
        const generated = [...new Set(tasksList.map(task => task.renewalType))];
        setGeneratedRenewals(generated);

        const groupedTasks = tasksList.reduce((acc, task) => {
          // Map 'completed' (lowercase) to 'Complete' to match our TaskStatus type
          let status: TaskStatus;
          if (task.status === 'completed') {
            status = 'Complete';
          } else if (task.status && STATUS_ORDER.includes(task.status)) {
            status = task.status;
          } else {
            status = 'Upcoming';
          }
          
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
        
        console.log('DEBUG: Total tasks found:', tasksList.length);
        console.log('DEBUG: Tasks by status:', finalGroupedTasks);

      } catch (err) {
        console.error("Error fetching tasks: ", err);
        setError('Failed to load tasks. Please try again later.');
      } finally {
        setTasksLoading(false);
      }
  };


  useEffect(() => {
    fetchCompanyAndTasks();
  }, [companyId, renewalTypeFilter]);

  useEffect(() => {
    if (company?.renewals) {
      console.log('DEBUG: Company renewals data:', company.renewals);
      const today = new Date();
      const upcoming = company.renewals.filter(r => {
        console.log('DEBUG: Processing renewal:', r);
        if (!r.date) {
          console.log('DEBUG: No date for renewal:', r.type);
          return false;
        }
        const daysUntilRenewal = differenceInCalendarDays(r.date, today);
        console.log(`DEBUG: ${r.type} renewal - Days until: ${daysUntilRenewal}, Date: ${r.date}`);
        const isUpcoming = daysUntilRenewal >= 0 && daysUntilRenewal <= 120;
        console.log(`DEBUG: ${r.type} is upcoming: ${isUpcoming}`);
        return isUpcoming;
      });
      console.log('DEBUG: Upcoming renewals:', upcoming);
      setUpcomingRenewals(upcoming);
    }
  }, [company]);

  const handleCreateTasks = async (renewal: Renewal) => {
    console.log('DEBUG: handleCreateTasks called with:', renewal);
    if (!companyId || !renewal.date) {
      console.log('DEBUG: Missing companyId or renewal.date');
      return;
    }

    console.log(`DEBUG: Querying templates for policyType: ${renewal.type}`);
    const templatesQuery = query(collection(db, 'tasks'), where('policyType', '==', renewal.type));
    const templatesSnapshot = await getDocs(templatesQuery);

    if (templatesSnapshot.empty) {
        console.log(`DEBUG: No task templates found for policy type: ${renewal.type}`);
        alert(`No task templates found for ${renewal.type}. Please create templates first in Settings > Task Settings.`);
        return;
    }
    console.log(`DEBUG: Found ${templatesSnapshot.size} templates for ${renewal.type}`);

    const batch = writeBatch(db);
    const companyTasksCollection = collection(db, 'companyTasks');
    
    const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Task }));
    
    templates.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    templates.forEach((templateData, index) => {
      const { id, ...restOfTemplateData } = templateData;
      const newCompanyTaskRef = doc(companyTasksCollection);

      // Tasks without dependencies should start with "Needs attention"
      const hasDependencies = templateData.dependencies && templateData.dependencies.length > 0;
      const initialStatus = hasDependencies ? 'Upcoming' : 'Needs attention';

      const newCompanyTask = {
        ...restOfTemplateData,
        templateId: id,
        companyId: companyId,
        renewalType: renewal.type,
        renewalDate: Timestamp.fromDate(renewal.date!),
        status: initialStatus as const,
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
                <h1 className="text-3xl font-bold">
                  {renewalTypeFilter
                    ? `${policyTypes.find(p => p.value === renewalTypeFilter)?.label || renewalTypeFilter} Tasks for ${company?.name || 'Company'}`
                    : `Tasks for ${company?.name || 'Company'}`
                  }
                </h1>
                <p className="text-muted-foreground mt-2">
                    {renewalTypeFilter
                      ? `Viewing ${policyTypes.find(p => p.value === renewalTypeFilter)?.label || renewalTypeFilter} renewal tasks.`
                      : 'This is where you can view all the tasks for this specific company.'
                    }
                </p>
                
            </div>
        )}

      </div>
      
      <div>
        {tasksLoading ? (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
            </div>
        ) : error ? (
            <p className="text-destructive p-6">{error}</p>
        ) : (
            <div className="space-y-8">
              {/* Show message if no tasks exist */}
              {allTasksCount === 0 && (
                <p className="text-muted-foreground text-center p-6">No tasks have been created for this company yet.</p>
              )}
              
              {/* Show renewal sections that have tasks */}
              {allTasksCount > 0 && Object.entries(
                Object.values(tasksByStatus).flat().reduce((groups: { [key: string]: { [key: string]: CompanyTask[] } }, task) => {
                  const renewalType = policyTypes.find(p => p.value === task.renewalType)?.label || task.renewalType || 'Other';
                  // Map 'completed' status to 'Complete' for consistency
                  let status = task.status || 'Upcoming';
                  if (status === 'completed') {
                    status = 'Complete';
                  }
                  
                  if (!groups[renewalType]) {
                    groups[renewalType] = {};
                  }
                  if (!groups[renewalType][status]) {
                    groups[renewalType][status] = [];
                  }
                  groups[renewalType][status].push(task);
                  return groups;
                }, {})
              ).map(([renewalType, statusGroups]) => {
                const renewalTypeValue = policyTypes.find(p => p.label === renewalType)?.value || renewalType.toLowerCase().replace(/\s+/g, '-');
                const matchingRenewal = upcomingRenewals.find(r => r.type === renewalTypeValue);
                
                return (
                  <div key={renewalType} className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold">{renewalType}</h3>
                    {matchingRenewal && matchingRenewal.date && (
                      <p className="text-sm text-muted-foreground mt-1 mb-6">
                        Renewal Date: {format(matchingRenewal.date, 'PPP')}
                      </p>
                    )}
                    {!matchingRenewal && (
                      <div className="mb-6" />
                    )}
                    
                    {/* Show renewal alert if there's a matching upcoming renewal */}
                    {matchingRenewal && (
                      <Alert className="mb-6">
                        <AlertDescription>
                          <div className="flex justify-between items-center">
                            <span>Start the renewal process for {renewalType}</span>
                            <div className="flex items-center gap-2">
                              {generatedRenewals.includes(matchingRenewal.type) ? (
                                <>
                                 <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteTasks(matchingRenewal.type)}
                                    aria-label={`Delete ${matchingRenewal.type} tasks`}
                                  >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                                 <Button disabled>
                                   Tasks Created
                                 </Button>
                                </>
                              ) : (
                                <Button onClick={() => handleCreateTasks(matchingRenewal)}>
                                   Create tasks
                                </Button>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-6">
                      {STATUS_ORDER.map(status => {
                        const tasks = statusGroups[status] || [];
                        if (tasks.length === 0) return null;
                        
                        return (
                          <div key={status}>
                            <h4 className={`text-base font-medium mb-4 ${
                              status === 'Complete' ? 'text-green-600 dark:text-green-500' : ''
                            }`}>
                              {status}
                              {status === 'Complete' && (
                                <span className="ml-2 inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                                  ✓ {tasks.length} completed
                                </span>
                              )}
                            </h4>
                            <ul className="divide-y">
                              {tasks.map((task) => (
                                <li key={task.id} className={`flex items-center justify-between p-4 ${
                                  status === 'Complete' ? 'bg-green-50 dark:bg-green-950/20 opacity-75' : ''
                                }`}>
                                  <div className="flex items-center gap-4">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                      status === 'Complete' ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
                                    }`}>
                                      {status === 'Complete' ? (
                                        <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                                      ) : task.tag === 'ai' ? (
                                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                                      ) : (
                                        <User className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div>
                                      <p className={`font-medium ${
                                        status === 'Complete' ? 'line-through text-muted-foreground' : ''
                                      }`}>
                                        {task.taskName || 'Unnamed Task'}
                                      </p>
                                    </div>
                                    <Badge variant={status === 'Complete' ? 'outline' : 'secondary'}>
                                      {task.phase}
                                    </Badge>
                                  </div>
                                  <Button asChild variant="outline" size="sm">
                                    <Link href={`/companies/${companyId}/tasks/${task.id}`}>
                                      View
                                    </Link>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Show renewal sections that don't have tasks yet but have upcoming renewals */}
              {upcomingRenewals.filter(renewal => {
                const renewalLabel = policyTypes.find(p => p.value === renewal.type)?.label || renewal.type;
                const allTasks = Object.values(tasksByStatus).flat();
                console.log('DEBUG: Checking if tasks exist for', renewal.type);
                console.log('DEBUG: All tasks:', allTasks);
                console.log('DEBUG: Task renewal types:', allTasks.map(t => t.renewalType));
                const hasExistingTasks = allTasks.some(task => {
                  const taskRenewalType = task.renewalType;
                  const matches = taskRenewalType === renewal.type;
                  console.log(`DEBUG: Comparing task.renewalType "${taskRenewalType}" with renewal.type "${renewal.type}": ${matches}`);
                  return matches;
                });
                console.log(`DEBUG: ${renewal.type} has existing tasks: ${hasExistingTasks}`);
                return !hasExistingTasks;
              }).map(renewal => {
                const renewalLabel = policyTypes.find(p => p.value === renewal.type)?.label || renewal.type;
                return (
                  <div key={renewal.type} className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold">{renewalLabel}</h3>
                    {renewal.date && (
                      <p className="text-sm text-muted-foreground mt-1 mb-6">
                        Renewal Date: {format(renewal.date, 'PPP')}
                      </p>
                    )}
                    <Alert>
                      <AlertDescription>
                        <div className="flex justify-between items-center">
                          <span>Start the renewal process for {renewalLabel}</span>
                          <div className="flex items-center gap-2">
                            <Button onClick={() => handleCreateTasks(renewal)}>
                               Create tasks
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                );
              })}
            </div>
        )}
      </div>
    </div>
  );
}
