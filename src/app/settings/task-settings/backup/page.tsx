'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

export default function TaskBackupPage() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch('/api/backup-tasks');
      if (!response.ok) {
        throw new Error('Failed to backup tasks');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-templates-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Backup Successful",
        description: "Your task templates have been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: "Could not backup task templates. Please try again.",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setBackupData(data);
        toast({
          title: "File Loaded",
          description: `Found ${data.length} task templates ready to restore.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please select a valid task templates backup JSON file.",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!backupData || !Array.isArray(backupData)) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Please select a backup file first.",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const batch = writeBatch(db);
      
      for (const task of backupData) {
        const { id, createdAt, updatedAt, ...taskData } = task;
        
        // Use the original ID if it exists, otherwise generate a new one
        const docRef = id ? doc(db, 'tasks', id) : doc(collection(db, 'tasks'));
        
        batch.set(docRef, {
          ...taskData,
          // Preserve timestamps if they exist
          ...(createdAt && { createdAt: new Date(createdAt) }),
          ...(updatedAt && { updatedAt: new Date(updatedAt) }),
        });
      }
      
      await batch.commit();
      
      toast({
        title: "Restore Successful",
        description: `Successfully restored ${backupData.length} task templates.`,
      });
      
      setBackupData(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Could not restore task templates. Please try again.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/settings/task-settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Task Settings
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Task Templates Backup & Restore</h1>
        <p className="text-muted-foreground mt-2">
          Export and import your task templates for safekeeping or migration.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Templates</CardTitle>
            <CardDescription>
              Download all your task templates as a JSON file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleBackup} 
              disabled={isBackingUp}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isBackingUp ? 'Creating Backup...' : 'Download Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Templates</CardTitle>
            <CardDescription>
              Restore task templates from a backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
              />
            </div>
            
            {backupData && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to restore {backupData.length} task templates.
                  This will overwrite existing templates with the same IDs.
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleRestore} 
              disabled={!backupData || isRestoring}
              className="w-full"
              variant={backupData ? "default" : "secondary"}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isRestoring ? 'Restoring...' : 'Restore from Backup'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Task templates are already using Firebase document IDs 
          for better flexibility with sorting and management. The numeric IDs you see (like #1, #2) 
          are just the sortOrder field for display purposes. Your actual task IDs are unique 
          Firebase document IDs.
        </AlertDescription>
      </Alert>
    </div>
  );
}