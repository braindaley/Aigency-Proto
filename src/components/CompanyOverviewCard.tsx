'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, differenceInCalendarMonths } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { CompanyTask } from '@/lib/types';
import Link from 'next/link';

interface Renewal {
  id: number;
  type: string;
  date: Date | undefined;
}

interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  renewals?: Renewal[];
  lastUpdated?: Date;
}

interface TaskCounts {
  needsAction: number;
  upcoming: number;
  completed: number;
}

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
    <div className="w-full mt-4 relative">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        {months.map((month, index) => (
          <span key={index} className="flex-1 text-center">{format(month, 'MMM')}</span>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full" style={{ height: '6px' }} />
      <div className="relative w-full" style={{ minHeight: '40px' }}>
        {Object.entries(renewalsByMonth).map(([monthIndex, monthRenewals]) => (
          <div
            key={monthIndex}
            className="absolute flex flex-col items-center"
            style={{
              left: `calc(${(parseInt(monthIndex) / 15) * 100}% + ${(100 / 15 / 2)}%)`,
              transform: 'translateX(-50%)',
              top: '4px'
            }}
          >
            {monthRenewals.map((renewal, index) => (
              <div
                key={renewal.id}
                className="text-xs font-medium text-gray-600 whitespace-nowrap"
                style={{
                  display: 'flex',
                  padding: '1px 6px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '8px',
                  backgroundColor: '#f0f0f0',
                  position: 'absolute',
                  top: `${index * 22}px`
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

interface CompanyCardProps {
  company: Company;
  taskCounts: TaskCounts;
  activeTasks: CompanyTask[];
}

const CompanyCard = ({ company, taskCounts, activeTasks }: CompanyCardProps) => {
  const policyTypeLabels: { [key: string]: string } = {
    'workers-comp': 'Workers Comp',
    'automotive': 'Auto',
    'general-liability': 'General Liability',
    'property': 'Property',
  };

  // Get unique renewal types
  const activeRenewalTypes = [...new Set(activeTasks.map(task => task.renewalType))];
  
  // Calculate how many days ago was last updated
  const getLastUpdatedText = (lastUpdated?: Date) => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastUpdated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Last updated today';
    if (diffDays === 1) return 'Last updated yesterday';
    return `Last updated ${diffDays} days ago`;
  };

  // Get the earliest renewal date for "Bind by" display
  const getBindByDate = (renewalType: string) => {
    const renewalTasks = activeTasks.filter(task => task.renewalType === renewalType);
    if (renewalTasks.length === 0) return null;
    
    // Assuming renewalDate exists on tasks
    const dates = renewalTasks
      .filter(task => task.renewalDate)
      .map(task => task.renewalDate.toDate());
    
    if (dates.length === 0) return null;
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    return `Bind by ${format(earliestDate, 'M/d/yyyy')}`;
  };
  
  return (
    <Link href={`/companies/${company.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">{company.name}</h2>
            <span className="text-sm text-muted-foreground">
              {getLastUpdatedText(company.lastUpdated)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Timeline renewals={company.renewals || []} startDate={new Date()} />
          
          <div className="space-y-2 pt-4">
            {activeRenewalTypes.map(renewalType => {
              const renewalTasks = activeTasks.filter(task => task.renewalType === renewalType);
              const needsActionCount = renewalTasks.filter(t => t.status === 'Needs attention').length;
              const upcomingCount = renewalTasks.filter(t => t.status === 'Upcoming').length;
              const completedCount = renewalTasks.filter(t => t.status === 'Complete').length;
              const bindByDate = getBindByDate(renewalType);
              
              return (
                <div key={renewalType} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-sm min-w-[140px]">
                      {policyTypeLabels[renewalType] || renewalType}
                    </span>
                    {bindByDate && (
                      <span className="text-sm text-muted-foreground">
                        {bindByDate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {needsActionCount > 0 && (
                      <Badge variant="destructive" className="rounded-full px-3">
                        {needsActionCount} Needs action
                      </Badge>
                    )}
                    {upcomingCount > 0 && (
                      <Badge variant="secondary" className="rounded-full px-3">
                        {upcomingCount} Upcoming
                      </Badge>
                    )}
                    {completedCount > 0 && (
                      <Badge variant="outline" className="rounded-full px-3">
                        {completedCount} Complete
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            
            {activeRenewalTypes.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No active tasks
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default function CompanyOverviewCards() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasksByCompany, setTasksByCompany] = useState<{ [key: string]: CompanyTask[] }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all companies
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const companiesList = companiesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            renewals: data.renewals?.map((r: any) => ({
              ...r,
              date: r.date?.toDate ? r.date.toDate() : undefined,
            })).filter((r: any) => r.date) || [],
          } as Company;
        });

        // Fetch all tasks
        const tasksSnapshot = await getDocs(collection(db, 'companyTasks'));
        const tasksList = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as CompanyTask[];

        // Group tasks by company
        const tasksGrouped: { [key: string]: CompanyTask[] } = {};
        tasksList.forEach(task => {
          if (!tasksGrouped[task.companyId]) {
            tasksGrouped[task.companyId] = [];
          }
          tasksGrouped[task.companyId].push(task);
        });

        // Calculate last updated for each company based on tasks
        const companiesWithLastUpdated = companiesList.map(company => {
          const companyTasks = tasksGrouped[company.id] || [];
          let lastUpdated = new Date(0);
          
          companyTasks.forEach(task => {
            if (task.renewalDate && task.renewalDate instanceof Timestamp) {
              const taskDate = task.renewalDate.toDate();
              if (taskDate > lastUpdated) {
                lastUpdated = taskDate;
              }
            }
          });
          
          return {
            ...company,
            lastUpdated,
          };
        });

        // Sort companies by last updated
        companiesWithLastUpdated.sort((a, b) => 
          (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0)
        );

        setCompanies(companiesWithLastUpdated);
        setTasksByCompany(tasksGrouped);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p>Loading companies...</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {companies.map(company => {
        const companyTasks = tasksByCompany[company.id] || [];
        const taskCounts: TaskCounts = {
          needsAction: companyTasks.filter(t => t.status === 'Needs attention').length,
          upcoming: companyTasks.filter(t => t.status === 'Upcoming').length,
          completed: companyTasks.filter(t => t.status === 'Complete').length,
        };
        
        return (
          <CompanyCard
            key={company.id}
            company={company}
            taskCounts={taskCounts}
            activeTasks={companyTasks}
          />
        );
      })}
    </div>
  );
}