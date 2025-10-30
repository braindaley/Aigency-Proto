'use client';

import { useEffect, useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Sparkles, User, RotateCcw } from 'lucide-react';
import { BuildPackageProgress } from './BuildPackageProgress';
import { BuildPackageArtifacts } from './BuildPackageArtifacts';
import { BuildPackageArtifactThumbnails } from './BuildPackageArtifactThumbnails';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SmartMessageRenderer } from '@/components/MarkdownRenderer';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: any;
}

interface WorkflowState {
  phase: 'upload' | 'processing' | 'review' | 'complete';
  uploadedDocuments: {
    employeeCount?: string;
    payroll?: string;
    lossRuns?: string;
  };
  taskIds: string[];
  chatHistory: Message[];
  status: 'in_progress' | 'completed' | 'failed';
}

interface BuildPackageWorkflowProps {
  workflowId: string;
  companyId: string;
  renewalType: string;
}

export function BuildPackageWorkflow({
  workflowId,
  companyId,
  renewalType,
}: BuildPackageWorkflowProps) {
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [artifactTaskIds, setArtifactTaskIds] = useState<string[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Subscribe to workflow changes
    const workflowRef = doc(db, 'buildPackageWorkflows', workflowId);
    const unsubscribe = onSnapshot(workflowRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as WorkflowState;
        console.log('Raw workflow data from Firestore:', data);
        setWorkflow(data);
        setMessages(data.chatHistory || []);

        // Update artifact task IDs for processing and review phases
        if (data.phase === 'processing' || data.phase === 'review' || data.phase === 'complete') {
          // Show artifacts from tasks 4-8 (Research OSHA, ACORD 130, ACORD 125, narrative, coverage suggestions)
          const artifactIndices = [3, 4, 5, 6, 7]; // 0-indexed: tasks 4, 5, 6, 7, 8
          console.log('All taskIds:', data.taskIds);
          const artifactIds = artifactIndices
            .map((idx) => {
              const taskId = data.taskIds?.[idx];
              console.log(`Task at index ${idx}:`, taskId);
              return taskId;
            })
            .filter(Boolean);

          console.log('Setting artifact task IDs:', artifactIds);
          setArtifactTaskIds(artifactIds);
        }
      }
    });

    return () => unsubscribe();
  }, [workflowId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleFileUpload = async () => {
    if (attachedFiles.length === 0) return;

    setUploading(true);

    // Add assistant message showing the uploaded files
    const fileNames = attachedFiles.map(f => f.name).join(', ');
    const uploadMessage: Message = {
      role: 'assistant',
      content: `📎 Received documents:\n${attachedFiles.map(f => `- ${f.name}`).join('\n')}`,
      timestamp: Timestamp.now(),
    };

    await fetch('/api/build-package/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId,
        message: uploadMessage,
      }),
    });

    try {
      const uploadedDocs: { [key: string]: string } = {};

      for (const file of attachedFiles) {
        const fileName = file.name.toLowerCase();

        // Determine document type based on filename
        let docType: string | null = null;
        if (fileName.includes('employee') || fileName.includes('job')) {
          docType = 'employeeCount';
        } else if (fileName.includes('payroll') || fileName.includes('classification')) {
          docType = 'payroll';
        } else if (fileName.includes('loss') || fileName.includes('run')) {
          docType = 'lossRuns';
        }

        if (!docType) continue;

        // Upload to Firebase Storage
        const storageRef = ref(storage, `companies/${companyId}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Add to Firestore documents collection
        const docRef = await addDoc(collection(db, `companies/${companyId}/documents`), {
          name: file.name,
          url: downloadURL,
          size: file.size,
          type: file.type,
          uploadedAt: Timestamp.now(),
          category: 'submission',
        });

        uploadedDocs[docType] = docRef.id;
      }

      // Update workflow with uploaded documents
      const response = await fetch('/api/build-package/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          uploadedDocuments: uploadedDocs,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process uploads');
      }

      setAttachedFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    // If there are files, upload them first
    if (attachedFiles.length > 0) {
      await handleFileUpload();
    }

    // Send message if there's text
    if (input.trim()) {
      const newMessage: Message = {
        role: 'user',
        content: input,
        timestamp: Timestamp.now(),
      };

      await fetch('/api/build-package/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          message: newMessage,
        }),
      });

      setInput('');
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset this workflow? This will delete all progress.')) {
      return;
    }

    try {
      // Reset the workflow document
      const workflowRef = doc(db, 'buildPackageWorkflows', workflowId);
      await updateDoc(workflowRef, {
        phase: 'upload',
        uploadedDocuments: {},
        chatHistory: [{
          role: 'assistant',
          content: "Let's build your Workers' Compensation submission package! To get started, please upload the following documents:\n\n1. **Employee count & job descriptions** - Details about your employees and their roles\n2. **Payroll by classification** - Payroll data broken down by classification codes\n3. **Loss runs (3–5 years)** - Your historical claims data\n\nYou can drag and drop multiple files at once, or click the upload button below.",
          timestamp: Timestamp.now(),
        }],
        status: 'in_progress',
      });

      // Clear local state - messages will be updated by the snapshot listener
      setArtifactTaskIds([]);
      setAttachedFiles([]);
      setInput('');
    } catch (error) {
      console.error('Error resetting workflow:', error);
      alert('Failed to reset workflow. Please try again.');
    }
  };

  if (!workflow) {
    return <div>Loading workflow...</div>;
  }

  const showArtifacts = (workflow.phase === 'processing' || workflow.phase === 'review' || workflow.phase === 'complete') && artifactTaskIds.length > 0;

  console.log('Workflow state:', {
    phase: workflow.phase,
    artifactTaskIds,
    showArtifacts,
    taskIdsLength: workflow.taskIds?.length
  });

  return (
    <div className="space-y-8">
      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Chat */}
        <div className="space-y-6">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user' ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-12'
                          : 'bg-muted mr-12'
                      }`}
                    >
                      <SmartMessageRenderer content={message.content} />
                    </div>
                  </div>
                </div>
              ))}

              {/* Show artifact thumbnails inline when in review/complete phase */}
              {(workflow.phase === 'review' || workflow.phase === 'complete') && artifactTaskIds.length > 0 && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg p-4 bg-muted mr-12">
                      <BuildPackageArtifactThumbnails
                        taskIds={artifactTaskIds}
                        companyId={companyId}
                        onSelectArtifact={setSelectedArtifactId}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Indicators (Processing Phase) - Only show when actively processing */}
              {workflow.phase === 'processing' && workflow.status === 'in_progress' && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg p-4 bg-muted mr-12">
                      <BuildPackageProgress taskIds={workflow.taskIds.slice(3, 8)} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="space-y-4">
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md text-sm"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>{file.name}</span>
                    <button
                      onClick={() =>
                        setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message or upload a document..."
                className="min-h-[60px] resize-none"
                disabled={uploading}
              />
              <Button onClick={handleSendMessage} size="icon" disabled={uploading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Artifact Viewer */}
        <div>
          {showArtifacts && artifactTaskIds.length > 0 && (
            <BuildPackageArtifacts
              taskIds={selectedArtifactId ? [selectedArtifactId] : artifactTaskIds}
              companyId={companyId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
