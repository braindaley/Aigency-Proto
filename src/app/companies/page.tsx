
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Company {
  id: number;
  name: string;
}

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const handleAddCompany = () => {
    if (newCompanyName.trim()) {
      setCompanies([
        ...companies,
        { id: Date.now(), name: newCompanyName.trim() },
      ]);
      setNewCompanyName('');
      setIsAdding(false);
    }
  };

  const handleDeleteCompany = (id: number) => {
    setCompanies(companies.filter((company) => company.id !== id));
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground mt-2">
            Manage your companies here.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add a new company</CardTitle>
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
                <Button variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCompany}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for a company..."
          className="w-full pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredCompanies.map((company) => (
          <Card key={company.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <p className="font-medium">{company.name}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteCompany(company.id)}
                aria-label={`Delete ${company.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {companies.length > 0 && filteredCompanies.length === 0 && (
          <p className="text-center text-muted-foreground">
            No companies found matching your search.
          </p>
        )}
        {companies.length === 0 && !isAdding && (
           <p className="text-center text-muted-foreground py-8">
            No companies yet. Click &quot;Add New&quot; to get started.
          </p>
        )}
      </div>
    </div>
  );
}
