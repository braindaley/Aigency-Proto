'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Company {
  id: string;
  name: string;
}

export default function CompaniesSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const querySnapshot = await getDocs(collection(db, 'companies'));
      const companiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Company));
      setCompanies(companiesData);
    };

    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Company Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your companies and their configurations.
          </p>
        </div>
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="mr-2 h-4 w-4" /> Add Company
          </Link>
        </Button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search companies..."
          className="w-full pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredCompanies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{company.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Configure settings for this company
                </p>
                <Button asChild size="sm">
                  <Link href={`/companies/${company.id}/settings`}>
                    Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {companies.length > 0 && filteredCompanies.length === 0 && (
          <p className="text-center text-muted-foreground">
            No companies found matching your search.
          </p>
        )}
        {companies.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No companies configured yet.
              </p>
              <div className="mt-4 text-center">
                <Button asChild>
                  <Link href="/companies/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Company
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}