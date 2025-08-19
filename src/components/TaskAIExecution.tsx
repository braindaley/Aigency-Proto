'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Bot, FileText, Download, User, Send, Paperclip } from 'lucide-react';
import { CompanyTask } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TaskAIExecutionProps {
  task: CompanyTask;
  companyId: string;
}

export function TaskAIExecution({ task, companyId }: TaskAIExecutionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    let messageContent = input;
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map(f => f.name).join(', ');
      messageContent += `\n\nAttached files: ${fileList}`;
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
                      <Bot className="h-4 w-4" />
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
                    <Bot className="h-4 w-4" />
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