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
import { doc, onSnapshot, collection, addDoc, Timestamp, updateDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
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
  const [allArtifactsReady, setAllArtifactsReady] = useState(false);
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

  useEffect(() => {
    // Check if all displayable artifacts are ready
    const checkArtifactsReady = async () => {
      if (artifactTaskIds.length === 0) {
        setAllArtifactsReady(false);
        return;
      }

      try {
        const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
        const artifactsSnapshot = await getDocs(artifactsRef);

        let readyCount = 0;
        let displayableCount = 0;

        for (const taskId of artifactTaskIds) {
          const artifactDoc = artifactsSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.taskId === taskId && data.data && data.data.trim().length > 0;
          });

          if (artifactDoc) {
            const data = artifactDoc.data();
            const taskName = data.taskName || '';

            // Only count artifacts that will be displayed (ACORD 130, ACORD 125, narrative)
            const shouldShowPreview = taskName.toLowerCase().includes('acord 130') ||
                                     taskName.toLowerCase().includes('acord 125') ||
                                     taskName.toLowerCase().includes('narrative');

            if (shouldShowPreview) {
              displayableCount++;
              readyCount++;
            }
          }
        }

        // All displayable artifacts must be ready (typically 3: ACORD 130, ACORD 125, narrative)
        const allReady = displayableCount >= 3 && readyCount === displayableCount;
        setAllArtifactsReady(allReady);
        console.log(`Displayable artifacts ready: ${readyCount}/${displayableCount} (total tasks: ${artifactTaskIds.length})`, allReady);
      } catch (error) {
        console.error('Error checking artifacts:', error);
        setAllArtifactsReady(false);
      }
    };

    checkArtifactsReady();

    // Poll for updates during processing phase
    if (workflow?.phase === 'processing' && artifactTaskIds.length > 0) {
      const interval = setInterval(checkArtifactsReady, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [artifactTaskIds, companyId, workflow?.phase]);

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
    if (!confirm('Are you sure you want to reset this workflow? This will delete all progress, uploaded documents, and generated artifacts.')) {
      return;
    }

    try {
      // Get workflow data to access task IDs
      const workflowRef = doc(db, 'buildPackageWorkflows', workflowId);
      const workflowDoc = await getDoc(workflowRef);

      if (workflowDoc.exists()) {
        const workflowData = workflowDoc.data();
        const taskIds = workflowData.taskIds || [];

        // Delete artifacts for all workflow tasks
        if (taskIds.length > 0) {
          const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
          const artifactsSnapshot = await getDocs(artifactsRef);

          const deletePromises = artifactsSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return taskIds.includes(data.taskId);
            })
            .map(doc => deleteDoc(doc.ref));

          await Promise.all(deletePromises);
          console.log(`Deleted ${deletePromises.length} artifacts`);
        }

        // Delete uploaded documents if they were tracked
        const uploadedDocs = workflowData.uploadedDocuments || {};
        const docIds = Object.values(uploadedDocs).filter(Boolean) as string[];

        if (docIds.length > 0) {
          const docDeletePromises = docIds.map(docId =>
            deleteDoc(doc(db, `companies/${companyId}/documents`, docId))
          );

          await Promise.all(docDeletePromises);
          console.log(`Deleted ${docIds.length} uploaded documents`);
        }

        // Reset all task statuses back to Upcoming
        if (taskIds.length > 0) {
          const taskUpdatePromises = taskIds.map(taskId =>
            updateDoc(doc(db, 'companyTasks', taskId), {
              status: 'Upcoming',
              updatedAt: Timestamp.now(),
            })
          );

          await Promise.all(taskUpdatePromises);
          console.log(`Reset ${taskIds.length} tasks to Upcoming status`);
        }
      }

      // Reset the workflow document
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
      setAllArtifactsReady(false);
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

  const showArtifacts = (workflow.phase === 'processing' || workflow.phase === 'review' || workflow.phase === 'complete') && artifactTaskIds.length > 0 && allArtifactsReady;

  console.log('Workflow state:', {
    phase: workflow.phase,
    artifactTaskIds,
    allArtifactsReady,
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

              {/* Show artifact thumbnails inline when in review/complete phase and all artifacts are ready */}
              {(workflow.phase === 'review' || workflow.phase === 'complete') && artifactTaskIds.length > 0 && allArtifactsReady && (
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
