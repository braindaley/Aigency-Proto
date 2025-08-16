
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Calendar as CalendarIcon, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
}

interface Renewal {
    id: number;
    type: string;
    date: Date | undefined;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const handleAddRenewal = () => {
    setRenewals([...renewals, { id: Date.now(), type: '', date: undefined }]);
  };

  const handleRenewalChange = (id: number, type: string) => {
      setRenewals(renewals.map(r => r.id === id ? { ...r, type } : r));
  }

  const handleDateChange = (id: number, date: Date | undefined) => {
      setRenewals(renewals.map(r => r.id === id ? { ...r, date } : r));
  }

  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      try {
        const companyDoc = await getDoc(doc(db, 'companies', id));
        if (companyDoc.exists()) {
          setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
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

    fetchCompany();
  }, [id]);

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

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
            <Link href="/companies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Companies
            </Link>
        </Button>
        <p className="mb-2 font-bold uppercase text-base leading-4 text-muted-foreground">ID {company.id}</p>
        <h1 className="text-3xl font-bold">{company.name}</h1>
      </div>
      
      <Card className="border-0 shadow-none">
        <CardContent className="p-0 pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Company Description</Label>
              <p className="text-muted-foreground">{company.description || 'No description provided.'}</p>
            </div>
            <div className="space-y-2">
              <Label>Company Website</Label>
              {company.website ? (
                 <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-primary hover:underline"
                >
                    {company.website}
                    <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              ) : (
                <p className="text-muted-foreground">No website provided.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
            <CardTitle>Next renewal</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {renewals.map((renewal) => (
                    <div key={renewal.id} className="flex items-center gap-4">
                        <Select onValueChange={(value) => handleRenewalChange(renewal.id, value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a policy type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="workers-comp">Worker's Comp</SelectItem>
                                <SelectItem value="automotive">Automotive</SelectItem>
                                <SelectItem value="general-liability">General Liability</SelectItem>
                                <SelectItem value="property">Property</SelectItem>
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
                    </div>
                ))}
            </div>
            <Button onClick={handleAddRenewal} variant="outline" size="sm" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add
            </Button>
        </CardContent>
    </Card>
    </div>
  );
}
