
'use client';

import { useEffect, useState } from 'eact';
import { useParams } from 'ext/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'ucide-react';
import Link from 'ext/link';
import { Label } from '@/components/ui/label';

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const id = params.id ? parseInt(params.id as string, 10) : null;

  useEffect(() => {
    if (isClient && id !== null) {
      try {
        const storedCompanies = localStorage.getItem('companies');
        if (storedCompanies) {
          const companies: Company[] = JSON.parse(storedCompanies);
          const foundCompany = companies.find((c) => c.id === id);
          setCompany(foundCompany || null);
        }
      } catch (error) {
        console.error("Failed to parse companies from localStorage", error);
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    } else if (isClient) {
      setIsLoading(false);
    }
  }, [id, isClient]);

  if (!isClient || isLoading) {
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
              <p className="text-muted-foreground">{company.description || 'o description provided.'}</p>
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
    </div>
  );
}
