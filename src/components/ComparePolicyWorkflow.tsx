'use client';

import { useEffect, useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Sparkles, User, RotateCcw, FileText } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SmartMessageRenderer } from '@/components/MarkdownRenderer';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: any;
}

interface WorkflowState {
  phase: 'upload' | 'processing' | 'complete';
  uploadedDocuments: {
    proposal?: string;
    issuedPolicy?: string;
  };
  chatHistory: Message[];
  status: 'in_progress' | 'completed' | 'failed';
  comparisonResult?: string;
}

interface ComparePolicyWorkflowProps {
  workflowId: string;
  companyId: string;
}

export function ComparePolicyWorkflow({
  workflowId,
  companyId,
}: ComparePolicyWorkflowProps) {
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Subscribe to workflow changes
    const workflowRef = doc(db, 'comparePolicyWorkflows', workflowId);
    const unsubscribe = onSnapshot(workflowRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as WorkflowState;
        console.log('Workflow data:', data);
        setWorkflow(data);
        setMessages(data.chatHistory || []);
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
    const uploadMessage: Message = {
      role: 'assistant',
      content: `📎 Received documents:\n${attachedFiles.map(f => `- ${f.name}`).join('\n')}`,
      timestamp: Timestamp.now(),
    };

    await fetch('/api/compare-policy/send-message', {
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

        // Priority order: check for specific keywords
        if (fileName.includes('acord') || fileName.includes('issued') || fileName.includes('policy')) {
          docType = 'issuedPolicy';
        } else if (fileName.includes('proposal') || fileName.includes('binder') || fileName.includes('quote') || fileName.includes('bound')) {
          docType = 'proposal';
        }

        // If we can't determine from filename, assign based on what's missing
        if (!docType) {
          if (!uploadedDocs.proposal) {
            docType = 'proposal';
          } else if (!uploadedDocs.issuedPolicy) {
            docType = 'issuedPolicy';
          }
        }

        // Skip if we already have this type
        if (!docType || uploadedDocs[docType]) {
          console.log(`Skipping file ${file.name} - type: ${docType}, already have: ${JSON.stringify(uploadedDocs)}`);
          continue;
        }

        console.log(`Processing file: ${file.name} as ${docType}`);

        // Upload to Firebase Storage
        const storageRef = ref(storage, `companies/${companyId}/compare-policy/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Add to Firestore documents collection
        const docRef = await addDoc(collection(db, `companies/${companyId}/documents`), {
          name: file.name,
          url: downloadURL,
          size: file.size,
          type: file.type,
          uploadedAt: Timestamp.now(),
          category: 'policy-comparison',
        });

        uploadedDocs[docType] = docRef.id;
      }

      console.log('Uploaded documents to send to API:', uploadedDocs);

      // Update workflow with uploaded documents
      const response = await fetch('/api/compare-policy/upload-complete', {
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

      await fetch('/api/compare-policy/send-message', {
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
    if (!confirm('Are you sure you want to reset this workflow? This will delete all progress and uploaded documents.')) {
      return;
    }

    try {
      const workflowRef = doc(db, 'comparePolicyWorkflows', workflowId);
      const workflowDoc = await getDoc(workflowRef);

      if (workflowDoc.exists()) {
        const workflowData = workflowDoc.data();
        const uploadedDocs = workflowData.uploadedDocuments || {};
        const docIds = Object.values(uploadedDocs).filter(Boolean) as string[];

        if (docIds.length > 0) {
          const docDeletePromises = docIds.map(docId =>
            doc(db, `companies/${companyId}/documents`, docId)
          );
          console.log(`Deleted ${docIds.length} uploaded documents`);
        }
      }

      // Reset the workflow document
      await updateDoc(workflowRef, {
        phase: 'upload',
        uploadedDocuments: {},
        chatHistory: [{
          role: 'assistant',
          content: "Let's compare your Workers' Compensation policy documents! Please upload:\n\n1. **ACORD 130** - The ACORD 130 form\n2. **Issued Policy** - The final policy document from the carrier\n\nYou can drag and drop both files at once, or click the upload button below.",
          timestamp: Timestamp.now(),
        }],
        status: 'in_progress',
        comparisonResult: null,
      });

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

              {/* Processing Indicator */}
              {workflow.phase === 'processing' && workflow.status === 'in_progress' && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Sparkles className="h-4 w-4 text-muted-foreground animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg p-4 bg-muted mr-12">
                      <p className="text-sm">Analyzing documents and comparing policy details...</p>
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
                accept=".pdf,.doc,.docx"
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
                placeholder="Type your message or upload documents..."
                className="min-h-[60px] resize-none"
                disabled={uploading}
              />
              <Button onClick={handleSendMessage} size="icon" disabled={uploading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Comparison Result */}
        <div>
          {workflow.phase === 'complete' && workflow.comparisonResult && (
            <div className="rounded-lg border bg-card">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h3 className="font-semibold">Policy Comparison Analysis</h3>
                </div>
              </div>
              <ScrollArea className="h-[600px]">
                <div className="p-4">
                  <SmartMessageRenderer content={workflow.comparisonResult} />
                </div>
              </ScrollArea>
            </div>
          )}

          {workflow.phase === 'upload' && (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload both documents to begin the comparison
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
