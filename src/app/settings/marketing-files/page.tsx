'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Trash2, Download, Eye, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarketingFile {
  id: string;
  name: string;
  insuranceType: string;
  description?: string;
  url: string;
  storagePath: string;
  size: number;
  uploadedAt: any;
  uploadedBy?: string;
}

const insuranceTypes = [
  { value: 'workers-comp', label: "Workers' Compensation", color: 'bg-blue-500' },
  { value: 'auto', label: 'Auto Insurance', color: 'bg-green-500' },
  { value: 'general-liability', label: 'General Liability', color: 'bg-purple-500' },
  { value: 'property', label: 'Property Insurance', color: 'bg-orange-500' },
  { value: 'umbrella', label: 'Umbrella Insurance', color: 'bg-red-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' },
];

export default function MarketingFilesPage() {
  const [files, setFiles] = useState<MarketingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('workers-comp');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState('workers-comp');
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const filesRef = collection(db, 'marketingFiles');
      const snapshot = await getDocs(filesRef);

      const loadedFiles: MarketingFile[] = [];
      snapshot.docs.forEach(doc => {
        loadedFiles.push({
          id: doc.id,
          ...doc.data()
        } as MarketingFile);
      });

      setFiles(loadedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress({});

      let successCount = 0;
      let failCount = 0;

      // Upload files sequentially to show progress
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        try {
          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 0
          }));

          // Upload to Firebase Storage
          const storagePath = `marketing-files/${selectedType}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);

          await uploadBytes(storageRef, file);

          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 50
          }));

          const url = await getDownloadURL(storageRef);

          // Save metadata to Firestore
          await addDoc(collection(db, 'marketingFiles'), {
            name: file.name,
            insuranceType: selectedType,
            description: description || null,
            url,
            storagePath,
            size: file.size,
            uploadedAt: serverTimestamp(),
            uploadedBy: 'admin' // TODO: Get from auth context
          });

          // Complete progress
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 100
          }));

          successCount++;
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          failCount++;

          // Mark as failed
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: -1
          }));
        }
      }

      // Show result
      if (failCount > 0) {
        alert(`Uploaded ${successCount} file(s). ${failCount} file(s) failed.`);
      }

      // Reset form
      setSelectedFiles([]);
      setDescription('');
      setUploadProgress({});
      await loadFiles();

      // Switch to the tab of uploaded files
      setActiveTab(selectedType);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: MarketingFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, file.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'marketingFiles', file.id));

      await loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const getFilesForType = (type: string) => {
    return files.filter(f => f.insuranceType === type);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Marketing Files</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage marketing materials organized by insurance type. These files will be available to the AI assistant for context.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* File Browser */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Marketing Materials by Insurance Type</CardTitle>
              <CardDescription>
                Browse and manage marketing files organized by insurance type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                  {insuranceTypes.map(type => (
                    <TabsTrigger key={type.value} value={type.value} className="text-xs">
                      {type.label.split(' ')[0]}
                      <Badge variant="secondary" className="ml-1">
                        {getFilesForType(type.value).length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {insuranceTypes.map(type => (
                  <TabsContent key={type.value} value={type.value} className="mt-4">
                    <div className="space-y-3">
                      {loading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : getFilesForType(type.value).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No files uploaded for {type.label}</p>
                          <p className="text-sm">Use the upload form to add marketing materials</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-2 pr-4">
                            {getFilesForType(type.value).map(file => (
                              <Card key={file.id} className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium truncate">{file.name}</h4>
                                      {file.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        <span>{formatFileSize(file.size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(file.uploadedAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                    >
                                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                    >
                                      <a href={file.url} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(file)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Upload Form */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Upload Marketing File</CardTitle>
              <CardDescription>
                Add a new marketing document to the library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="insurance-type">Insurance Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="insurance-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {insuranceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Files (Multiple)</Label>
                <Input
                  id="file"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">
                      Selected: {selectedFiles.length} file(s)
                    </p>
                    <ScrollArea className="h-[120px] rounded border p-2">
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(index)}
                              className="ml-2 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description (applies to all files)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {uploading && Object.keys(uploadProgress).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Upload Progress:</p>
                  <div className="space-y-1">
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[200px]">{fileName}</span>
                          <span>
                            {progress === -1 ? '❌ Failed' :
                             progress === 100 ? '✅ Complete' :
                             `${progress}%`}
                          </span>
                        </div>
                        {progress >= 0 && progress < 100 && (
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading {Object.keys(uploadProgress).filter(k => uploadProgress[k] === 100).length} / {selectedFiles.length}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}` : 'Files'}
                  </>
                )}
              </Button>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  ✨ <strong>Multiple files supported</strong> - Select multiple files to upload at once
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, Word, Excel, PowerPoint, Text
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  These files will be accessible to the AI assistant when working on tasks for the corresponding insurance type.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
