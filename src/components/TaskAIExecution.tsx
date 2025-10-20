'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, FileText, Download, User, Send, Paperclip, CheckCircle } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { parseFileContent, formatFileDataForChat } from '@/lib/file-parser';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TaskAIExecutionProps {
  task: CompanyTask;
  companyId: string;
  onTaskComplete?: () => void;
}

export function TaskAIExecution({ task, companyId, onTaskComplete }: TaskAIExecutionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Generate storage key based on task and company IDs
  const storageKey = `task-chat-${companyId}-${task.id}`;

  // Initialize messages with default message only
  useEffect(() => {
    // No localStorage - always start fresh or load from Firebase
    // Set initial message
    setMessages([{
      id: 'initial',
      role: 'assistant',
      content: `Hello! I'm here to help you complete the task: "${task.taskName}".

${task.description}

How can I assist you with this task today?`,
    }]);
  }, [task.id, task.taskName, task.description, companyId, storageKey]);

  // Removed localStorage - messages should be persisted to Firebase if needed

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

  const handlePredefinedButtonClick = (action: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: action,
    };
    setMessages(prev => [...prev, userMessage]);
    // Trigger API call similar to form submission
    handleChatSubmission([...messages, userMessage]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;
    if (isLoading) return;

    console.log('Form submitted with files:', attachedFiles.length);

    let messageContent = input;
    let filesUploaded = false;

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
                // Check if artifact already exists for this task and file
                const artifactName = `${task.taskName} - ${file.name} Data`;
                const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
                const existingQuery = query(
                  artifactsRef,
                  where('name', '==', artifactName),
                  where('taskId', '==', task.id)
                );
                const existingArtifacts = await getDocs(existingQuery);

                if (existingArtifacts.empty) {
                  // Only create artifact if it doesn't already exist
                  await addDoc(artifactsRef, {
                    name: artifactName,
                    type: 'form_data',
                    data: parsedFile.data,
                    description: `Parsed data from ${file.name} uploaded for task: ${task.taskName}`,
                    taskId: task.id,
                    taskName: task.taskName,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    tags: ['task-upload', parsedFile.type]
                  });
                  console.log(`Created new artifact: ${artifactName}`);
                } else {
                  // Update existing artifact instead
                  const existingDoc = existingArtifacts.docs[0];
                  await updateDoc(doc(db, `companies/${companyId}/artifacts`, existingDoc.id), {
                    data: parsedFile.data,
                    updatedAt: serverTimestamp(),
                    description: `Parsed data from ${file.name} uploaded for task: ${task.taskName} (updated)`
                  });
                  console.log(`Updated existing artifact: ${artifactName}`);
                }
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
          await updateDoc(doc(db, 'companyTasks', task.id), {
            status: 'completed',
            completedAt: serverTimestamp(),
            completionNote: `Documents uploaded: ${fileList}`
          });

          toast({
            title: 'Task Completed',
            description: 'Task marked as complete with uploaded documents',
          });

          // Notify parent component
          if (onTaskComplete) {
            onTaskComplete();
          }
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        toast({
          title: 'Upload Failed',
          description: 'Failed to upload files. Please try again.',
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
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    await handleChatSubmission([...messages, userMessage]);
  };

  const handleChatSubmission = async (currentMessages: ChatMessage[]) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages,
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
    }
  };

  const generatePDF = () => {
    // Mock PDF generation - in real implementation this would generate actual PDF
    alert('PDF generation would be implemented here');
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Left Side - Chat Interface */}
      <div className="max-w-[672px] flex-1 relative flex flex-col">
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
                    className={`rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
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

        {/* Floating Input Box */}
        <div className="sticky bottom-0 bg-background border-t pt-4">
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
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
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

            {/* Predefined Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {(task.predefinedButtons && task.predefinedButtons.length > 0 
                ? task.predefinedButtons 
                : [
                    { label: "Approve", action: "I approve this document" },
                    { label: "Request Changes", action: "I need changes to this document" },
                    { label: "Analyze data", action: "Please analyze the attached data" },
                    { label: "Create PDF", action: "Generate a PDF version of this document" }
                  ]
              ).map((button, index) => (
                <Button
                  key={index}
                  type="button"
                  onClick={() => handlePredefinedButtonClick(button.action)}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Document Viewer */}
      <div className="max-w-[672px] flex-1">
        <Card className="flex flex-col h-full">
          <CardContent className="flex-1 flex flex-col pt-6">
            <ScrollArea className="flex-1 mb-4">
              <div className="p-4 bg-background min-h-[400px]">
                <div className="space-y-4">
                  <div className="text-center pb-4">
                    <h2 className="text-xl font-bold">{task.taskName}</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold">Task Description</h3>
                    <p className="text-sm leading-relaxed">{task.description}</p>
                  </div>

                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}