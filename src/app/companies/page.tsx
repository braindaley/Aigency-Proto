
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: number;
  name: string;
}

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const storedCompanies = localStorage.getItem('companies');
    if (storedCompanies) {
      setCompanies(JSON.parse(storedCompanies));
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      const storedCompanies = localStorage.getItem('companies');
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

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
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Link>
        </Button>
      </div>

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
             <CardContent className="p-0">
              <Link href={`/companies/${company.id}`} className="block flex-1 p-4 rounded-lg hover:bg-accent">
                  <p className="font-medium">{company.name}</p>
              </Link>
            </CardContent>
          </Card>
        ))}
        {companies.length > 0 && filteredCompanies.length === 0 && (
          <p className="text-center text-muted-foreground">
            No companies found matching your search.
          </p>
        )}
        {companies.length === 0 && (
           <p className="text-center text-muted-foreground py-8">
            No companies yet. Click &quot;Add New&quot; to get started.
          </p>
        )}
      </div>
    </div>
  );
}
