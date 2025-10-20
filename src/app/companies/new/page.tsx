
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/ui/file-upload';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

export default function NewCompanyPage() {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();

  const handleAddCompany = async () => {
    if (companyName.trim()) {
      try {
        // First create the company document
        const docRef = await addDoc(collection(db, 'companies'), {
          name: companyName.trim(),
          description: description.trim(),
          website: website.trim(),
          createdAt: new Date(),
        });

        // Upload files to Firebase Storage and collect metadata
        const storage = getStorage();
        const uploadedFiles = [];

        for (const file of files) {
          const storageRef = ref(storage, `companies/${docRef.id}/documents/${file.name}`);
          await uploadBytes(storageRef, file);

          // Store file metadata
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            path: `companies/${docRef.id}/documents/${file.name}`,
            uploadedAt: new Date(),
          });
        }

        // Update the company document with file metadata
        if (uploadedFiles.length > 0) {
          await updateDoc(doc(db, 'companies', docRef.id), {
            documents: uploadedFiles,
          });
        }

        router.push('/companies');
      } catch (error) {
        console.error('Error adding document: ', error);
      }
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
              <FileUpload onFilesChange={setFiles} />
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
