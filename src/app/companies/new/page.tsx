
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
}

export default function NewCompanyPage() {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const router = useRouter();

  const handleAddCompany = () => {
    if (companyName.trim()) {
      const storedCompanies = localStorage.getItem('companies');
      const companies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
      
      const newCompany: Company = {
        id: Date.now(),
        name: companyName.trim(),
        description: description.trim(),
        website: website.trim(),
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
        <CardHeader className="p-0">
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyDescription">Company description</Label>
              <Textarea
                id="companyDescription"
                placeholder="Enter company description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uploadDocuments">Upload documents</Label>
              <Input
                id="uploadDocuments"
                type="file"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company website</Label>
              <Input
                id="companyWebsite"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
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
