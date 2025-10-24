'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { TaskValidationResults } from './TaskValidationResults';
import { processDocument, ProcessedDocument } from '@/lib/documentProcessor';
import { SmartMessageRenderer } from '@/components/MarkdownRenderer';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, orderBy, where, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parseFileContent, formatFileDataForChat } from '@/lib/file-parser';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  documents?: ProcessedDocument[];
  completedAutomatically?: boolean;
  isValidation?: boolean;
  isCompletionSummary?: boolean;
}

interface TaskChatProps {
  task: CompanyTask;
  companyId: string;
  onTaskUpdate?: () => void;
  inlineContent?: React.ReactNode;
}

export function TaskChat({ task, companyId, onTaskUpdate, inlineContent }: TaskChatProps) {
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
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();

  const earlyTaskNames = new Set([
    'request employee count & job descriptions',
    'request payroll by classification',
    'request loss runs (3–5 years)',
  ]);
  const parsedSortOrder =
    typeof task.sortOrder === 'number'
      ? task.sortOrder
      : task.sortOrder !== undefined && task.sortOrder !== null
        ? Number.parseInt(String(task.sortOrder), 10)
        : undefined;
  const isEarlyManualTask =
    task.tag === 'manual' &&
    (
      (parsedSortOrder !== undefined &&
        !Number.isNaN(parsedSortOrder) &&
        [1, 2, 3].includes(parsedSortOrder)) ||
      (task.taskName ? earlyTaskNames.has(task.taskName.toLowerCase().trim()) : false)
    );

  // Process message content to replace artifact tags with brief summaries
  const processMessageForDisplay = (content: string, taskName: string): string => {
    let processedContent = content;

    // Check if message contains artifact tags
    const artifactMatch = processedContent.match(/<artifact>([\s\S]*?)<\/artifact>/);

    if (artifactMatch) {
      // Extract content before and after artifact
      const beforeArtifact = processedContent.substring(0, processedContent.indexOf('<artifact>'));
      const afterArtifact = processedContent.substring(processedContent.indexOf('</artifact>') + 11);

      // Create a brief summary message
      const summary = `Based on the information provided and data in the database, I have created the ${taskName}.`;

      // Return message without artifact, just the summary
      processedContent = `${beforeArtifact.trim()}\n\n${summary}\n\n${afterArtifact.trim()}`.trim();
    }

    // Check if message contains file contents section
    if (processedContent.includes('=== FILE CONTENTS ===')) {
      // Remove everything from "=== FILE CONTENTS ===" onwards
      const fileContentsIndex = processedContent.indexOf('=== FILE CONTENTS ===');
      processedContent = processedContent.substring(0, fileContentsIndex).trim();
    }

    return processedContent;
  };

  // Generate storage key based on task and company IDs - include task tag to invalidate cache when type changes
  const storageKey = `task-chat-${companyId}-${task.id}-${task.tag}`;

  // Load messages from Firestore on component mount
  useEffect(() => {
    if (hasInitialized) {
      return; // Prevent duplicate initialization
    }

    const loadMessages = async () => {
      setHasInitialized(true); // Mark as initialized immediately to prevent race conditions

      try {
        // Load messages from Firestore
        const messagesRef = collection(db, 'taskChats', task.id, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
        const messagesSnapshot = await getDocs(messagesQuery);

        if (!messagesSnapshot.empty) {
          // Convert Firestore documents to ChatMessage format
          const firestoreMessages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              role: data.role,
              content: data.content,
              completedAutomatically: data.completedAutomatically,
              isValidation: data.isValidation,
              isCompletionSummary: data.isCompletionSummary,
            } as ChatMessage;
          });

          // Filter out auto-completed messages and raw artifacts
          // Only show the final completion summary if task is completed
          const filteredMessages = task.status === 'Complete'
            ? firestoreMessages.filter(msg =>
                // For completed tasks, show completion summary but hide other auto messages and raw artifacts
                (!msg.completedAutomatically || msg.isCompletionSummary) &&
                !msg.content.trim().startsWith('<artifact>')
              )
            : firestoreMessages.filter(msg =>
                // For in-progress tasks, show validation messages but hide other auto messages and raw artifacts
                (!msg.completedAutomatically || msg.isValidation) &&
                !msg.content.trim().startsWith('<artifact>')
              );

          setMessages(filteredMessages);
          console.log('TaskChat: Loaded', firestoreMessages.length, 'messages from Firestore,', filteredMessages.length, 'displayed');
        } else {
          // No messages in Firestore, check once more to prevent race condition
          // This double-check prevents duplicate initial messages
          const reCheckQuery = query(messagesRef, orderBy('timestamp', 'asc'));
          const reCheckSnapshot = await getDocs(reCheckQuery);

          if (!reCheckSnapshot.empty) {
            // Messages were created between our first check and now
            const firestoreMessages = reCheckSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                role: data.role,
                content: data.content,
                completedAutomatically: data.completedAutomatically,
                isValidation: data.isValidation,
                isCompletionSummary: data.isCompletionSummary,
              } as ChatMessage;
            });

            const filteredMessages = task.status === 'Complete'
              ? firestoreMessages.filter(msg =>
                  (!msg.completedAutomatically || msg.isCompletionSummary) &&
                  !msg.content.trim().startsWith('<artifact>')
                )
              : firestoreMessages.filter(msg =>
                  (!msg.completedAutomatically || msg.isValidation) &&
                  !msg.content.trim().startsWith('<artifact>')
                );

            setMessages(filteredMessages);
            console.log('TaskChat: Found messages on recheck, loaded', firestoreMessages.length, 'messages');
            return; // Exit early, no need to create initial message
          }

          // Still no messages after recheck, safe to create initial message
          const initialMessage = task.tag === 'manual'
            ? `Hi!

To complete the submission I'll need the following:

${task.description}

Let me know if these are approved.`
            : `Hello! I'm here to help you complete the task: "${task.taskName}".

${task.description}

How can I assist you with this task today?`;

          const initialMsg: ChatMessage = {
            id: 'initial',
            role: 'assistant',
            content: initialMessage,
          };

          setMessages([initialMsg]);

          // Save initial message to Firestore using setDoc with a fixed ID to prevent duplicates
          try {
            // Use a fixed document ID for the initial message
            const initialMessageDocId = 'initial_greeting_message';
            const initialMessageRef = doc(db, 'taskChats', task.id, 'messages', initialMessageDocId);

            // Use setDoc with merge:false to only create if doesn't exist
            await setDoc(initialMessageRef, {
              role: initialMsg.role,
              content: initialMsg.content,
              timestamp: serverTimestamp(),
              isInitialMessage: true,
            }, { merge: false }).then(() => {
              console.log('Created initial message for task', task.id);
            }).catch((error) => {
              // If document already exists, that's fine
              if (error.code === 'already-exists' || error.message?.includes('already exists')) {
                console.log('Initial message already exists for task', task.id);
              } else {
                console.error('Error creating initial message:', error);
              }
            });
          } catch (error) {
            console.error('Failed to save initial message to Firestore:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load task chat history from Firestore:', error);

        // Fall back to initial message
        const initialMessage = task.tag === 'manual'
          ? `Hi!

To complete the submission I'll need the following:

${task.description}

Let me know if these are approved.`
          : `Hello! I'm here to help you complete the task: "${task.taskName}".

${task.description}

How can I assist you with this task today?`;

        setMessages([{
          id: 'initial',
          role: 'assistant',
          content: initialMessage,
        }]);
      }
    };

    loadMessages();
  }, [task.id, hasInitialized]); // Only depend on task.id and hasInitialized to prevent re-initialization

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const runEarlyTaskValidation = async () => {
    try {
      const response = await fetch('/api/trigger-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run test');
      }

      const validation = data.validationResult;

      if (!validation) {
        throw new Error('No validation result returned');
      }

      const status = validation.overallStatus as string | undefined;
      const missing = Array.isArray(validation.missingCriteria) ? validation.missingCriteria : [];

      let resultMessage: string;
      if (status === 'COMPLETED') {
        resultMessage = '✅ Test passed.';
      } else if (status === 'PARTIALLY_COMPLETED') {
        const reason = missing.length > 0 ? `Missing: ${missing.join(', ')}.` : 'Additional information is required.';
        resultMessage = `❌ Test did not pass. ${reason}`;
      } else if (status === 'NOT_COMPLETED') {
        const reason = missing.length > 0 ? `Missing: ${missing.join(', ')}.` : 'Required information is missing.';
        resultMessage = `❌ Test did not pass. ${reason}`;
      } else {
        resultMessage = '❌ Test result unavailable. Please try again.';
      }

      const validationMessage: ChatMessage = {
        id: `${Date.now()}-validation`,
        role: 'assistant',
        content: resultMessage,
        isValidation: true,
      };

      setMessages(prev => [...prev, validationMessage]);

      try {
        await addDoc(collection(db, 'taskChats', task.id, 'messages'), {
          role: validationMessage.role,
          content: validationMessage.content,
          timestamp: serverTimestamp(),
          isValidation: true,
        });
      } catch (firestoreError) {
        console.error('Failed to save validation message to Firestore:', firestoreError);
      }

      if (status === 'COMPLETED' && onTaskUpdate) {
        setTimeout(() => {
          onTaskUpdate();
        }, 1000);
      }
    } catch (error) {
      console.error('Validation trigger error:', error);

      const errorText =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to run test. Please try again.';

      const errorMessage: ChatMessage = {
        id: `${Date.now()}-validation-error`,
        role: 'assistant',
        content: `❌ Test could not run. ${errorText}`,
        isValidation: true,
      };

      setMessages(prev => [...prev, errorMessage]);

      try {
        await addDoc(collection(db, 'taskChats', task.id, 'messages'), {
          role: errorMessage.role,
          content: errorMessage.content,
          timestamp: serverTimestamp(),
          isValidation: true,
        });
      } catch (firestoreError) {
        console.error('Failed to save validation error message to Firestore:', firestoreError);
      }

      toast({
        title: 'Test Error',
        description: errorText,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
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
                            task.description?.toLowerCase().includes('collect') ||
                            task.description?.toLowerCase().includes('request') ||
                            task.taskName?.toLowerCase().includes('documentation') ||
                            task.taskName?.toLowerCase().includes('request');
    
    console.log('Task requires documents:', requiresDocuments, {
      taskName: task.taskName,
      description: task.description
    });

    // Upload files to Firebase Storage and Documents
    if (attachedFiles.length > 0) {
      console.log('Starting file upload process:', attachedFiles.length, 'files');
      setUploadingFiles(true);
      const shouldIncludeFilePreview = !(isEarlyManualTask && attachedFiles.length > 0);
      let fileContents = '';
      
      try {
        for (const file of attachedFiles) {
          try {
            const processedDoc = await processDocument(file);
            processedDocuments.push(processedDoc);
          } catch (docError) {
            console.error(`Error processing document ${file.name}:`, docError);
          }

          try {
            const timestamp = Date.now();
            const storageRef = ref(storage, `companies/${companyId}/documents/${timestamp}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

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

            try {
              const parsedFile = await parseFileContent(file);
              const formattedContent = formatFileDataForChat(parsedFile);

              if (shouldIncludeFilePreview) {
                if (!fileContents) {
                  fileContents = '\n\n=== FILE CONTENTS ===\n';
                }
                fileContents += `\n📄 ${file.name}:\n${formattedContent}\n`;
              }

              if ((parsedFile.type === 'excel' || parsedFile.type === 'csv') && parsedFile.data) {
                const firestoreCompatibleData = Array.isArray(parsedFile.data)
                  ? parsedFile.data.map(row =>
                      Array.isArray(row) ? row.join('|') : String(row)
                    )
                  : parsedFile.data;

                const artifactName = `${task.taskName} - ${file.name} Data`;
                const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
                const existingQuery = query(
                  artifactsRef,
                  where('name', '==', artifactName),
                  where('taskId', '==', task.id)
                );
                const existingArtifacts = await getDocs(existingQuery);

                if (existingArtifacts.empty) {
                  await addDoc(artifactsRef, {
                    name: artifactName,
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
                  console.log(`Created new artifact: ${artifactName}`);
                } else {
                  const existingDoc = existingArtifacts.docs[0];
                  await updateDoc(doc(db, `companies/${companyId}/artifacts`, existingDoc.id), {
                    data: firestoreCompatibleData,
                    rowCount: Array.isArray(parsedFile.data) ? parsedFile.data.length : 0,
                    updatedAt: serverTimestamp(),
                    description: `Parsed data from ${file.name} uploaded for task: ${task.taskName} (updated)`
                  });
                  console.log(`Updated existing artifact: ${artifactName}`);
                }
              }
            } catch (parseError) {
              console.error(`Error parsing file ${file.name}:`, parseError);
              if (shouldIncludeFilePreview) {
                if (!fileContents) {
                  fileContents = '\n\n=== FILE CONTENTS ===\n';
                }
                fileContents += `\n📄 ${file.name}: [File uploaded but content parsing failed]\n`;
              }
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
        const successMessage = isEarlyManualTask
          ? 'Files uploaded successfully.'
          : `Files uploaded successfully: ${fileList}`;
        messageContent = messageContent
          ? `${messageContent}\n\n${successMessage}`
          : successMessage;

        if (shouldIncludeFilePreview && fileContents) {
          messageContent += fileContents;
        }

        toast({
          title: 'Files Uploaded',
          description: `${attachedFiles.length} file(s) saved to documents`,
        });

        if (requiresDocuments && filesUploaded) {
          // Update completion metadata
          await updateDoc(doc(db, 'companyTasks', task.id), {
            completedAt: serverTimestamp(),
            completionNote: `Documents uploaded: ${fileList}`
          });

          // Use the API endpoint to mark as completed, which will trigger dependent tasks
          try {
            const response = await fetch('/api/update-task-status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                taskId: task.id,
                status: 'completed'
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to update task status');
            }

            toast({
              title: 'Task Completed',
              description: 'Task marked as complete with uploaded documents',
            });

            if (onTaskUpdate) {
              onTaskUpdate();
            }
          } catch (error) {
            console.error('Error updating task status:', error);
            toast({
              title: 'Error',
              description: 'Task documents uploaded but status update failed',
              variant: 'destructive'
            });
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Save user message to Firestore
    try {
      const messageData: any = {
        role: userMessage.role,
        content: userMessage.content,
        timestamp: serverTimestamp(),
      };

      // Only add documents field if it exists and has items
      if (userMessage.documents && userMessage.documents.length > 0) {
        messageData.documents = userMessage.documents;
      }

      await addDoc(collection(db, 'taskChats', task.id, 'messages'), messageData);
    } catch (error) {
      console.error('Failed to save user message to Firestore:', error);
    }

    const shouldRunValidationOnly = isEarlyManualTask && filesUploaded;

    if (shouldRunValidationOnly) {
      setIsLoading(true);
      try {
        await runEarlyTaskValidation();
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);


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
          // Skip empty lines
          if (!line.trim()) continue;

          // Handle different streaming formats
          let content = '';
          if (line.startsWith('0:')) {
            content = line.slice(2).trim();
          } else if (line.startsWith('data: ')) {
            content = line.slice(6);
            if (content === '[DONE]') continue;
          } else if (line.startsWith(':')) {
            continue; // Skip comment lines
          } else if (/^\d+:/.test(line)) {
            // Handle any numeric prefix format (0:, 1:, etc.)
            content = line.replace(/^\d+:/, '').trim();
          } else {
            content = line;
          }

          if (content !== undefined && content !== '') {
            fullContent += content;
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

      // Save assistant message to Firestore after streaming completes
      if (fullContent) {
        try {
          await addDoc(collection(db, 'taskChats', task.id, 'messages'), {
            role: 'assistant',
            content: fullContent,
            timestamp: serverTimestamp(),
          });
        } catch (error) {
          console.error('Failed to save assistant message to Firestore:', error);
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

      // Save error message to Firestore
      try {
        await addDoc(collection(db, 'taskChats', task.id, 'messages'), {
          role: errorMessage.role,
          content: errorMessage.content,
          timestamp: serverTimestamp(),
        });
      } catch (firestoreError) {
        console.error('Failed to save error message to Firestore:', firestoreError);
      }
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

      // Add validation result to chat
      const validation = result.validation;
      let validationMessage = '';

      if (validation.overallStatus === 'COMPLETED') {
        validationMessage = `✅ ${validation.summary}\n\n${validation.nextSteps}`;
      } else {
        // Task not completed - show what's missing
        validationMessage = `⚠️ ${validation.summary}\n\n`;

        if (validation.missingInformation && validation.missingInformation.length > 0) {
          validationMessage += `**Missing Information:**\n`;
          validation.missingInformation.forEach((info: string) => {
            validationMessage += `• ${info}\n`;
          });
          validationMessage += '\n';
        }

        if (validation.recommendations && validation.recommendations.length > 0) {
          validationMessage += `**Recommendations:**\n`;
          validation.recommendations.forEach((rec: string) => {
            validationMessage += `• ${rec}\n`;
          });
          validationMessage += '\n';
        }

        validationMessage += `Please provide the missing information so I can help you complete this task.`;
      }

      const validationChatMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: validationMessage,
      };
      setMessages(prev => [...prev, validationChatMessage]);
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
                      ? 'bg-muted text-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="text-sm leading-relaxed overflow-hidden">
                    <SmartMessageRenderer
                      content={processMessageForDisplay(message.content, task.taskName)}
                      role={message.role}
                    />
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

          {/* Inline content (e.g., artifact cards) */}
          {inlineContent && inlineContent}

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
              onClick={() => {
                // Use setTimeout to ensure the click happens in a new event loop
                setTimeout(() => {
                  fileInputRef.current?.click();
                }, 0);
              }}
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
