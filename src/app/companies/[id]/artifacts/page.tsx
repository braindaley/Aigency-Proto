'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  Database,
  Calendar,
  Tag,
  Copy,
  Eye,
  EyeOff,
  Code,
  FileJson,
  Sparkles,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Create a permissive sanitize schema
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'class', 'style']
  }
};

import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

interface Artifact {
  id: string;
  name: string;
  type: string;
  data: any;
  taskId?: string;
  taskName?: string;
  renewalType?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  description?: string;
  carrierName?: string;
  artifactIndex?: number;
  totalArtifacts?: number;
}

interface Company {
  id: string;
  name: string;
  description: string;
}

interface ArtifactGroup {
  taskId: string;
  taskName: string;
  artifacts: Artifact[];
  isMulti: boolean;
  createdAt: Date;
}

export default function CompanyArtifacts() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const companyId = params.id as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ai-canvas');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artifactToDelete, setArtifactToDelete] = useState<Artifact | null>(null);
  const [artifactGroupToDelete, setArtifactGroupToDelete] = useState<ArtifactGroup | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'json',
    description: '',
    data: '',
    tags: '',
    taskName: '',
    renewalType: ''
  });

  const artifactTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'ai-canvas', label: 'AI Canvas (Documents)' },
    { value: 'form_data', label: 'File Uploads' },
    { value: 'json', label: 'JSON Data' },
    { value: 'text', label: 'Text' },
    { value: 'api_response', label: 'API Response' },
    { value: 'calculation', label: 'Calculation' },
    { value: 'report', label: 'Report' },
    { value: 'other', label: 'Other' }
  ];

  const renewalTypes = [
    { value: '', label: 'None' },
    { value: 'workers-comp', label: "Worker's Comp" },
    { value: 'automotive', label: 'Automotive' },
    { value: 'general-liability', label: 'General Liability' },
    { value: 'property', label: 'Property' }
  ];

  useEffect(() => {
    fetchCompanyAndArtifacts();
  }, [companyId]);

  const fetchCompanyAndArtifacts = async () => {
    try {
      // Fetch company details
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      if (companyDoc.exists()) {
        setCompany({
          id: companyDoc.id,
          ...companyDoc.data()
        } as Company);
      }

      // Fetch artifacts
      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
      const q = query(artifactsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const artifactsList: Artifact[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        artifactsList.push({
          id: doc.id,
          name: data.name,
          type: data.type || 'json',
          data: data.data,
          taskId: data.taskId,
          taskName: data.taskName,
          renewalType: data.renewalType,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tags: data.tags || [],
          description: data.description,
          carrierName: data.carrierName,
          artifactIndex: data.artifactIndex,
          totalArtifacts: data.totalArtifacts
        });
      });
      
      setArtifacts(artifactsList);
    } catch (error) {
      console.error('Error fetching artifacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load artifacts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      let parsedData = formData.data;
      
      // Try to parse JSON if type is JSON
      if (formData.type === 'json' || formData.type === 'api_response') {
        try {
          parsedData = JSON.parse(formData.data);
        } catch (e) {
          toast({
            title: 'Error',
            description: 'Invalid JSON data',
            variant: 'destructive'
          });
          return;
        }
      }

      const artifactData = {
        name: formData.name,
        type: formData.type,
        data: parsedData,
        description: formData.description,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        taskName: formData.taskName || null,
        renewalType: formData.renewalType || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editMode && selectedArtifact) {
        // Update existing artifact
        await updateDoc(doc(db, `companies/${companyId}/artifacts`, selectedArtifact.id), {
          ...artifactData,
          updatedAt: serverTimestamp()
        });
        toast({
          title: 'Success',
          description: 'Artifact updated successfully',
        });
      } else {
        // Create new artifact
        await addDoc(collection(db, `companies/${companyId}/artifacts`), artifactData);
        toast({
          title: 'Success',
          description: 'Artifact created successfully',
        });
      }
      
      setCreateDialogOpen(false);
      resetForm();
      fetchCompanyAndArtifacts();
    } catch (error) {
      console.error('Error saving artifact:', error);
      toast({
        title: 'Error',
        description: 'Failed to save artifact',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!artifactToDelete && !artifactGroupToDelete) return;

    try {
      if (artifactGroupToDelete) {
        // Delete all artifacts in the group
        await Promise.all(
          artifactGroupToDelete.artifacts.map(artifact =>
            deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifact.id))
          )
        );

        toast({
          title: 'Success',
          description: `Deleted ${artifactGroupToDelete.artifacts.length} artifacts successfully`,
        });
      } else if (artifactToDelete) {
        // Delete single artifact
        await deleteDoc(doc(db, `companies/${companyId}/artifacts`, artifactToDelete.id));

        toast({
          title: 'Success',
          description: 'Artifact deleted successfully',
        });
      }

      fetchCompanyAndArtifacts();
    } catch (error) {
      console.error('Error deleting artifact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete artifact',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setArtifactToDelete(null);
      setArtifactGroupToDelete(null);
    }
  };

  const handleEdit = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setFormData({
      name: artifact.name,
      type: artifact.type,
      description: artifact.description || '',
      data: typeof artifact.data === 'string' ? artifact.data : JSON.stringify(artifact.data, null, 2),
      tags: artifact.tags?.join(', ') || '',
      taskName: artifact.taskName || '',
      renewalType: artifact.renewalType || ''
    });
    setEditMode(true);
    setCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'json',
      description: '',
      data: '',
      tags: '',
      taskName: '',
      renewalType: ''
    });
    setEditMode(false);
    setSelectedArtifact(null);
  };

  const copyToClipboard = (data: any) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Data copied to clipboard',
    });
  };

  const filteredArtifacts = artifacts.filter(artifact => {
    const matchesSearch =
      artifact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artifact.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artifact.taskName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artifact.carrierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artifact.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    // Check type match - special handling for ai-canvas tag
    const matchesType = selectedType === 'all' ||
      artifact.type === selectedType ||
      (selectedType === 'ai-canvas' && artifact.tags?.includes('ai-canvas'));

    return matchesSearch && matchesType;
  });

  // Group artifacts by taskId for multi-artifact sets
  const groupedArtifacts: ArtifactGroup[] = [];
  const processedTaskIds = new Set<string>();

  filteredArtifacts.forEach(artifact => {
    if (!artifact.taskId) {
      // Standalone artifact without taskId
      groupedArtifacts.push({
        taskId: artifact.id,
        taskName: artifact.name,
        artifacts: [artifact],
        isMulti: false,
        createdAt: artifact.createdAt
      });
      return;
    }

    if (processedTaskIds.has(artifact.taskId)) {
      return; // Already grouped
    }

    // Find all artifacts with the same taskId
    const taskArtifacts = filteredArtifacts.filter(a => a.taskId === artifact.taskId);

    if (taskArtifacts.length > 1) {
      // Multiple artifacts - group them
      groupedArtifacts.push({
        taskId: artifact.taskId,
        taskName: artifact.taskName || artifact.name,
        artifacts: taskArtifacts.sort((a, b) => (a.artifactIndex || 0) - (b.artifactIndex || 0)),
        isMulti: true,
        createdAt: artifact.createdAt
      });
      processedTaskIds.add(artifact.taskId);
    } else {
      // Single artifact
      groupedArtifacts.push({
        taskId: artifact.taskId,
        taskName: artifact.taskName || artifact.name,
        artifacts: [artifact],
        isMulti: false,
        createdAt: artifact.createdAt
      });
      processedTaskIds.add(artifact.taskId);
    }
  });

  const getTypeIcon = (artifact: Artifact) => {
    // Check if it's an AI Canvas artifact first
    if (artifact.tags?.includes('ai-canvas')) {
      return <Sparkles className="h-5 w-5 text-purple-600" />;
    }
    
    switch(artifact.type) {
      case 'json':
      case 'api_response':
        return <FileJson className="h-5 w-5" />;
      case 'form_data':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'calculation':
        return <Database className="h-5 w-5" />;
      case 'text':
        return <FileText className="h-5 w-5" />;
      default:
        return <Code className="h-5 w-5" />;
    }
  };

  const formatData = (data: any) => {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading artifacts...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Link href={`/companies/${companyId}`}>
          <Button variant="ghost" size="sm" className="-ml-4 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Button>
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{company?.name} - Artifacts</h1>
            <p className="text-gray-600 mt-1">Task-generated data and references</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            New Artifact
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search artifacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {artifactTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Artifacts ({filteredArtifacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {groupedArtifacts.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No artifacts found</p>
              <p className="text-sm text-gray-400 mt-1">Create artifacts to store task data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedArtifacts.map((group) => {
                const artifact = group.artifacts[0]; // Use first for display
                return group.isMulti ? (
                  // Multi-artifact group
                  <div
                    key={group.taskId}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{group.taskName}</p>
                            <Badge variant="secondary" className="text-xs">
                              {group.artifacts.length} documents
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Multiple carrier-specific submissions
                          </p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {group.artifacts.map((art, idx) => (
                              art.carrierName && (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {art.carrierName}
                                </Badge>
                              )
                            ))}
                          </div>
                          {artifact.taskName && (
                            <p className="text-sm text-gray-500 mt-1">
                              Task: {artifact.taskName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Created {format(group.createdAt, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedArtifact(artifact);
                            setShowRawData(false);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setArtifactGroupToDelete(group);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Single artifact
                  <div
                    key={artifact.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getTypeIcon(artifact)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{artifact.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {artifact.type}
                            </Badge>
                            {artifact.renewalType && (
                              <Badge variant="secondary" className="text-xs">
                                {renewalTypes.find(r => r.value === artifact.renewalType)?.label}
                              </Badge>
                            )}
                          </div>
                          {artifact.description && (
                            <p className="text-sm text-gray-600 mt-1">{artifact.description}</p>
                          )}
                          {artifact.taskName && (
                            <p className="text-sm text-gray-500 mt-1">
                              Task: {artifact.taskName}
                            </p>
                          )}
                          {artifact.tags && artifact.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {artifact.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Created {format(artifact.createdAt, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedArtifact(artifact);
                            setShowRawData(false);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(artifact.data)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(artifact)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setArtifactToDelete(artifact);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Artifact' : 'Create New Artifact'}</DialogTitle>
            <DialogDescription>
              Store data generated by tasks for future reference
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Artifact name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {artifactTypes.slice(1).map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="renewalType">Renewal Type (Optional)</Label>
                <select
                  id="renewalType"
                  value={formData.renewalType}
                  onChange={(e) => setFormData({...formData, renewalType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {renewalTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="taskName">Task Name (Optional)</Label>
              <Input
                id="taskName"
                value={formData.taskName}
                onChange={(e) => setFormData({...formData, taskName: e.target.value})}
                placeholder="Associated task"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description"
              />
            </div>
            
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <div>
              <Label htmlFor="data">Data</Label>
              <Textarea
                id="data"
                value={formData.data}
                onChange={(e) => setFormData({...formData, data: e.target.value})}
                placeholder={formData.type === 'json' ? '{"key": "value"}' : 'Enter data...'}
                className="font-mono text-sm"
                rows={10}
              />
              {(formData.type === 'json' || formData.type === 'api_response') && (
                <p className="text-sm text-gray-500 mt-1">Enter valid JSON data</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedArtifact?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedArtifact?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{selectedArtifact?.type}</Badge>
              {selectedArtifact?.renewalType && (
                <Badge variant="secondary">
                  {renewalTypes.find(r => r.value === selectedArtifact.renewalType)?.label}
                </Badge>
              )}
              {selectedArtifact?.tags?.map((tag, index) => (
                <Badge key={index} variant="outline">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            
            {selectedArtifact?.taskName && (
              <div>
                <p className="text-sm font-medium">Associated Task</p>
                <p className="text-sm text-gray-600">{selectedArtifact.taskName}</p>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Data</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawData(!showRawData)}
                  >
                    {showRawData ? <Eye className="h-4 w-4 mr-2" /> : <Code className="h-4 w-4 mr-2" />}
                    {showRawData ? 'Formatted' : 'Raw'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedArtifact && copyToClipboard(selectedArtifact.data)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="bg-white border rounded-lg p-6 overflow-auto max-h-96">
                {showRawData ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
                    {selectedArtifact && formatData(selectedArtifact.data)}
                  </pre>
                ) : (
                  <div className="prose prose-sm max-w-none bg-background text-foreground
                                  prose-headings:text-foreground prose-headings:font-semibold prose-headings:bg-transparent
                                  prose-h1:text-2xl prose-h1:mb-4 prose-h1:bg-transparent
                                  prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:bg-transparent
                                  prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-h3:bg-transparent
                                  prose-p:text-foreground prose-p:bg-transparent
                                  prose-strong:text-foreground
                                  prose-ul:text-foreground prose-ol:text-foreground
                                  prose-code:bg-muted prose-code:text-foreground
                                  prose-pre:bg-muted prose-pre:text-foreground
                                  [&_pre]:bg-muted [&_pre]:text-foreground">
                    {selectedArtifact && typeof selectedArtifact.data === 'string' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}>{selectedArtifact.data}</ReactMarkdown>
                    ) : (
                      <pre className="text-sm font-mono whitespace-pre-wrap text-foreground">
                        {selectedArtifact && formatData(selectedArtifact.data)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>Created: {selectedArtifact && format(selectedArtifact.createdAt, 'MMM dd, yyyy HH:mm:ss')}</p>
              <p>Updated: {selectedArtifact && format(selectedArtifact.updatedAt, 'MMM dd, yyyy HH:mm:ss')}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {artifactGroupToDelete ? 'Delete Artifact Group' : 'Delete Artifact'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {artifactGroupToDelete ? (
                <>
                  Are you sure you want to delete "{artifactGroupToDelete.taskName}" and all {artifactGroupToDelete.artifacts.length} associated documents? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete "{artifactToDelete?.name}"? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}