'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { TaskValidationResults } from './TaskValidationResults';
import { processDocument, ProcessedDocument } from '@/lib/documentProcessor';
import { SmartMessageRenderer } from '@/components/MarkdownRenderer';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parseFileContent, formatFileDataForChat } from '@/lib/file-parser';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  documents?: ProcessedDocument[];
}

interface TaskChatProps {
  task: CompanyTask;
  companyId: string;
  onTaskUpdate?: () => void;
}

export function TaskChat({ task, companyId, onTaskUpdate }: TaskChatProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const { toast } = useToast();

  // Generate storage key based on task and company IDs
  const storageKey = `task-chat-${companyId}-${task.id}`;

  // Initialize messages with default or saved messages
  useEffect(() => {
    const savedMessages = localStorage.getItem(storageKey);
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Failed to load task chat history:', error);
        // Fall back to initial message
        setMessages([{
          id: 'initial',
          role: 'assistant',
          content: `Hello! I'm here to help you complete the task: "${task.taskName}". 

${task.description}

How can I assist you with this task today?`,
        }]);
      }
    } else {
      // Set initial message if no saved messages
      setMessages([{
        id: 'initial',
        role: 'assistant',
        content: `Hello! I'm here to help you complete the task: "${task.taskName}". 

${task.description}

How can I assist you with this task today?`,
      }]);
    }
  }, [task.id, task.taskName, task.description, companyId, storageKey]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;
    if (isLoading) return;

    console.log('Form submitted with files:', attachedFiles.length);

    let messageContent = input;
    let filesUploaded = false;
    let processedDocuments: ProcessedDocument[] = [];

    // Check if this task requires document submission
    const requiresDocuments = task.description?.toLowerCase().includes('upload') || 
                            task.description?.toLowerCase().includes('provide') ||
                            task.description?.toLowerCase().includes('submit') ||
                            task.taskName?.toLowerCase().includes('documentation');
    
    console.log('Task requires documents:', requiresDocuments, {
      taskName: task.taskName,
      description: task.description
    });

    // Upload files to Firebase Storage and Documents
    if (attachedFiles.length > 0) {
      console.log('Starting file upload process:', attachedFiles.length, 'files');
      setUploadingFiles(true);
      let fileContents = '\n\n=== FILE CONTENTS ===\n';
      
      try {
        for (const file of attachedFiles) {
          try {
            // First, upload to Firebase Storage (this should succeed even if parsing fails)
            const timestamp = Date.now();
            const storageRef = ref(storage, `companies/${companyId}/documents/${timestamp}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Save document reference in Firestore
            await addDoc(collection(db, `companies/${companyId}/documents`), {
              name: file.name,
              url: downloadURL,
              size: file.size,
              type: file.type,
              uploadedAt: serverTimestamp(),
              category: 'task-upload',
              taskId: task.id,
              taskName: task.taskName
            });

            console.log(`File uploaded successfully: ${file.name}`, { downloadURL, taskId: task.id });

            // Then try to parse file content for AI
            try {
              const parsedFile = await parseFileContent(file);
              const formattedContent = formatFileDataForChat(parsedFile);
              fileContents += `\n📄 ${file.name}:\n${formattedContent}\n`;

              // If Excel/CSV data, also save parsed data as an artifact
              if ((parsedFile.type === 'excel' || parsedFile.type === 'csv') && parsedFile.data) {
                // Convert nested arrays to strings for Firestore compatibility
                const firestoreCompatibleData = Array.isArray(parsedFile.data) 
                  ? parsedFile.data.map(row => 
                      Array.isArray(row) ? row.join('|') : String(row)
                    )
                  : parsedFile.data;

                await addDoc(collection(db, `companies/${companyId}/artifacts`), {
                  name: `${task.taskName} - ${file.name} Data`,
                  type: 'form_data',
                  data: firestoreCompatibleData,
                  originalFormat: 'excel_array',
                  rowCount: Array.isArray(parsedFile.data) ? parsedFile.data.length : 0,
                  description: `Parsed data from ${file.name} uploaded for task: ${task.taskName}`,
                  taskId: task.id,
                  taskName: task.taskName,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  tags: ['task-upload', parsedFile.type]
                });
              }
            } catch (parseError) {
              console.error(`Error parsing file ${file.name}:`, parseError);
              fileContents += `\n📄 ${file.name}: [File uploaded but content parsing failed]\n`;
            }
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            toast({
              title: 'Upload Error',
              description: `Failed to upload ${file.name}`,
              variant: 'destructive'
            });
          }
        }

        filesUploaded = true;
        const fileList = attachedFiles.map(f => f.name).join(', ');
        messageContent += `\n\nFiles uploaded successfully: ${fileList}`;
        messageContent += fileContents;

        toast({
          title: 'Files Uploaded',
          description: `${attachedFiles.length} file(s) saved to documents`,
        });

        // If task requires documents and files were uploaded, mark as complete
        if (requiresDocuments && filesUploaded) {
          await updateDoc(doc(db, `companies/${companyId}/tasks`, task.id), {
            status: 'completed',
            completedAt: serverTimestamp(),
            completionNote: `Documents uploaded: ${fileList}`
          });

          toast({
            title: 'Task Completed',
            description: 'Task marked as complete with uploaded documents',
          });

          // Notify parent component
          if (onTaskUpdate) {
            onTaskUpdate();
          }
        }
      } catch (error) {
        console.error('Error in file upload process:', error);
        toast({
          title: 'Upload Process Error',
          description: 'Some files may not have uploaded properly. Check console for details.',
          variant: 'destructive'
        });
      } finally {
        setUploadingFiles(false);
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      documents: processedDocuments.length > 0 ? processedDocuments : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const response = await fetch('/api/chat/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          taskId: task.id,
          companyId: companyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          // Handle different streaming formats
          if (line.startsWith('0:')) {
            const content = line.slice(2);
            if (content.trim()) {
              fullContent += content;
            }
          } else if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content.trim() && content !== '[DONE]') {
              fullContent += content;
            }
          } else if (line.trim() && !line.startsWith(':')) {
            // Direct content
            fullContent += line;
          }
          
          // Update the message
          if (fullContent) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Trigger task status refresh after AI response completes
      if (onTaskUpdate) {
        // Small delay to ensure any backend processing completes
        setTimeout(() => {
          onTaskUpdate();
        }, 1000);
      }
    }
  };

  const handleValidateCompletion = async () => {
    if (messages.length === 0) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ No conversation to validate yet. Please have a conversation or upload some documents first, then try validation again.',
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    let templateId = task.templateId;
    
    // Debug logging
    console.log('Task templateId:', task.templateId);
    console.log('Task name:', task.taskName);
    console.log('Full task object:', task);
    
    // Fallback: try to map task name to template ID for the first workers comp task as a test
    if ((!templateId || templateId === '3' || templateId === 3) && task.taskName === 'Request employee count & job descriptions') {
      templateId = 'Q41BkK5qUnMaZ0waRRla'; // Hard-coded template ID for testing
      console.log('Using fallback templateId:', templateId);
    }
    
    // Additional fallback for any task with ID 3
    if (templateId === '3' || templateId === 3) {
      templateId = 'Q41BkK5qUnMaZ0waRRla';
      console.log('Converted templateId 3 to:', templateId);
    }
    
    if (!templateId) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ This task "${task.taskName}" does not have a template associated with it for validation. Please contact your administrator to add a templateId field to link it to its template.`,
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch('/api/validate-task-completion-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyTaskId: task.id,
          templateTaskId: templateId,
          conversation: messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Validation response error:', response.status, errorText);
        throw new Error(`Validation failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Validation result:', result);
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Failed to validate task completion. This could be due to a temporary issue with the validation service. Please try again in a moment.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-200px)] flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted">
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-3 overflow-hidden ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm leading-relaxed overflow-hidden">
                    <SmartMessageRenderer content={message.content} role={message.role} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="rounded-full bg-slate-400 h-2 w-2"></div>
                      <div className="rounded-full bg-slate-400 h-2 w-2"></div>
                      <div className="rounded-full bg-slate-400 h-2 w-2"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="sticky bottom-0 bg-background border-t pt-4">
        <div>
          <form onSubmit={handleFormSubmit} className="space-y-3">
          {uploadingFiles && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Uploading and analyzing files...
                </span>
              </div>
            </div>
          )}
          
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Attached files:</p>
              <div className="space-y-1">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
                  >
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-[2px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message or upload a document..."
                className="min-h-[44px] max-h-[200px] resize-none pr-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFormSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
                size="icon"
                className="absolute right-1 bottom-1 h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
        </div>
      </div>

      {/* Validation Results Modal */}
      {validationResult && (
        <TaskValidationResults
          validation={validationResult.validation}
          taskName={validationResult.taskInfo?.taskName || task.taskName}
          onClose={() => setValidationResult(null)}
        />
      )}
    </div>
  );
}