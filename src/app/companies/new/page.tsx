
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Company {
  id: number;
  name: string;
}

export default function NewCompanyPage() {
  const [newCompanyName, setNewCompanyName] = useState('');
  const router = useRouter();

  const handleAddCompany = () => {
    if (newCompanyName.trim()) {
      const storedCompanies = localStorage.getItem('companies');
      const companies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
      
      const newCompany: Company = {
        id: Date.now(),
        name: newCompanyName.trim(),
      };

      const updatedCompanies = [...companies, newCompany];
      localStorage.setItem('companies', JSON.stringify(updatedCompanies));
      
      router.push('/companies');
    }
  };

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
          <h1 className="text-3xl font-bold">Add New Company</h1>
          <p className="text-muted-foreground mt-2">
            Enter the details for the new company.
          </p>
      </div>
      
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => router.push('/companies')}>
                Cancel
              </Button>
              <Button onClick={handleAddCompany}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
