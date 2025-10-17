'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AgencyInfo {
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  licenseNumber: string;
}

export default function AgencyInfoPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>({
    agencyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    licenseNumber: '',
  });

  useEffect(() => {
    loadAgencyInfo();
  }, []);

  const loadAgencyInfo = async () => {
    try {
      const docRef = doc(db, 'settings', 'agencyInfo');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setAgencyInfo(docSnap.data() as AgencyInfo);
      }
    } catch (error) {
      console.error('Error loading agency info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agency information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'agencyInfo');
      await setDoc(docRef, {
        ...agencyInfo,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Saved',
        description: 'Agency information saved successfully',
      });
    } catch (error) {
      console.error('Error saving agency info:', error);
      toast({
        title: 'Error',
        description: 'Failed to save agency information',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AgencyInfo, value: string) => {
    setAgencyInfo(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 md:py-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Agency Information</h1>
        <p className="text-muted-foreground mt-2">
          Configure your agency details used in documents, emails, and client communications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            This information will be used in marketing emails, proposals, and other client-facing documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input
                id="agencyName"
                value={agencyInfo.agencyName}
                onChange={(e) => handleChange('agencyName', e.target.value)}
                placeholder="Acme Insurance Agency"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={agencyInfo.contactName}
                onChange={(e) => handleChange('contactName', e.target.value)}
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={agencyInfo.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@agency.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={agencyInfo.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={agencyInfo.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={agencyInfo.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={agencyInfo.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="CA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={agencyInfo.zip}
                onChange={(e) => handleChange('zip', e.target.value)}
                placeholder="94102"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={agencyInfo.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.agency.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={agencyInfo.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                placeholder="CA-1234567"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
