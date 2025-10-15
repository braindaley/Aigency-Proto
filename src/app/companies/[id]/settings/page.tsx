'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Calendar as CalendarIcon, PlusCircle, Save, X, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, addMonths, differenceInCalendarMonths } from "date-fns"
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
                                backgroundColor: '#f0f0f0',
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

export default function CompanySettingsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [timelineStartDate, setTimelineStartDate] = useState(new Date());

  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedWebsite, setEditedWebsite] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const companyId = typeof id === 'string' ? id : '';

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
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
          setEditedName(companyData.name || '');
          setEditedDescription(companyData.description || '');
          setEditedWebsite(companyData.website || '');
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
  
  const handleAddRenewal = () => {
    setRenewals([...renewals, { id: Date.now(), type: '', date: undefined }]);
  };

  const handleRenewalChange = (id: number, type: string) => {
      setRenewals(renewals.map(r => r.id === id ? { ...r, type } : r));
  }

  const handleDateChange = (id: number, date: Date | undefined) => {
      setRenewals(renewals.map(r => r.id === id ? { ...r, date } : r));
  }
  
  const handleRemoveRenewal = (id: number) => {
    setRenewals(renewals.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    if (!company) return;

    try {
      const companyRef = doc(db, 'companies', company.id);

      const renewalsToSave = renewals
        .filter(r => r.type && r.date)
        .map(r => ({
            ...r,
            date: Timestamp.fromDate(r.date!),
        }));

      const updatedData = {
        name: editedName,
        description: editedDescription,
        website: editedWebsite,
        renewals: renewalsToSave,
      };

      await updateDoc(companyRef, updatedData);

      const updatedCompanyState: Company = {
        ...company,
        name: editedName,
        description: editedDescription,
        website: editedWebsite,
        renewals: renewalsToSave.map(r => ({...r, date: r.date.toDate()})),
      };

      setCompany(updatedCompanyState);
      setRenewals(updatedCompanyState.renewals || []);

      toast({
        title: "Success",
        description: "Company settings updated successfully.",
      });
    } catch (error) {
      console.error("Error updating company:", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update company settings.",
      });
    }
  };

  const handleDeleteCompany = async () => {
    if (!company) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/companies/${company.id}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      toast({
        title: "Success",
        description: "Company deleted successfully.",
      });

      // Redirect to companies list
      router.push('/companies');
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete company. Please try again.",
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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

  const displayRenewals = renewals.filter(r => r.type && r.date);
  const usedPolicyTypes = renewals.map(r => r.type).filter(Boolean);

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/companies/${companyId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <div>
          <p className="mb-2 font-bold uppercase text-base leading-4 text-muted-foreground">COMPANY SETTINGS</p>
          <h1 className="text-3xl font-bold">{company.name}</h1>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyDescription">Company Description</Label>
              <Textarea
                id="companyDescription"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Enter company description"
                className="min-h-[120px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                value={editedWebsite}
                onChange={(e) => setEditedWebsite(e.target.value)}
                placeholder="https://example.com"
              />
              {editedWebsite && (
                <a 
                    href={editedWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-sm text-primary hover:underline mt-2"
                >
                    Preview: {editedWebsite}
                    <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {renewals.map((renewal) => (
                <div key={renewal.id} className="flex items-center gap-4">
                  <Select 
                    onValueChange={(value) => handleRenewalChange(renewal.id, value)} 
                    defaultValue={renewal.type || undefined}
                    value={renewal.type || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a policy type" />
                    </SelectTrigger>
                    <SelectContent>
                      {policyTypes.map(policy => (
                        <SelectItem 
                          key={policy.value} 
                          value={policy.value}
                          disabled={usedPolicyTypes.includes(policy.value) && renewal.type !== policy.value}
                        >
                          {policy.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !renewal.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {renewal.date ? format(renewal.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={renewal.date}
                        onSelect={(date) => handleDateChange(renewal.id, date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRenewal(renewal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              onClick={handleAddRenewal} 
              variant="outline" 
              size="sm" 
              className="mt-4"
              disabled={renewals.length >= policyTypes.length}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Renewal
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 pt-6 mt-6">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Card className="mt-8 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this company and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This action cannot be undone. This will permanently delete the company, including:
          </p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside space-y-1">
            <li>All documents and files</li>
            <li>All tasks and task history</li>
            <li>All artifacts and generated content</li>
            <li>All conversations and messages</li>
            <li>All company settings and data</li>
          </ul>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Company
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Company
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{company?.name}</strong> and all associated data including:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="text-sm text-muted-foreground my-4 list-disc list-inside space-y-1">
            <li>All documents and files</li>
            <li>All tasks and task history</li>
            <li>All artifacts and generated content</li>
            <li>All conversations and messages</li>
            <li>All company settings and data</li>
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Company'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}