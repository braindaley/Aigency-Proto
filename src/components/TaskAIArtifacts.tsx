'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, User, Send, Download, Copy, FileText, Code, Eye, Loader2 } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Removed CSS import - using Tailwind classes instead

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Artifact {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'code' | 'markdown';
  createdAt: Date;
  updatedAt: Date;
}

interface TaskAIArtifactsProps {
  task: CompanyTask;
  companyId: string;
}

export function TaskAIArtifacts({ task, companyId }: TaskAIArtifactsProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  const storageKey = `task-artifact-${companyId}-${task.id}`;
  const chatStorageKey = `task-artifact-chat-${companyId}-${task.id}`;

  useEffect(() => {
    const savedArtifact = localStorage.getItem(storageKey);
    const savedMessages = localStorage.getItem(chatStorageKey);
    
    if (savedArtifact) {
      try {
        setArtifact(JSON.parse(savedArtifact));
      } catch (error) {
        console.error('Failed to load artifact:', error);
      }
    }

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }

    if (!savedArtifact) {
      // Always generate initial artifact for AI tasks
      generateInitialArtifact();
    }
  }, [task.id, companyId]);

  useEffect(() => {
    if (artifact) {
      localStorage.setItem(storageKey, JSON.stringify(artifact));
    }
  }, [artifact, storageKey]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const generateInitialArtifact = async () => {
    setIsGenerating(true);
    
    const initialMessage: ChatMessage = {
      id: 'system-init',
      role: 'user',
      content: `Generate the initial ${task.taskName} document based on the task requirements.`,
    };

    try {
      const response = await fetch('/api/chat/artifact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [initialMessage],
          taskId: task.id,
          companyId: companyId,
          generateArtifact: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate artifact');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let artifactContent = '';
      let inArtifact = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Extract content from streaming format
          let content = '';
          if (line.startsWith('0:')) {
            content = line.slice(2);
          } else if (line.startsWith('data: ')) {
            content = line.slice(6);
            if (content === '[DONE]') continue;
          } else if (line.startsWith(':')) {
            continue; // Skip comment lines
          } else {
            content = line;
          }

          if (content !== undefined) {
            // Check for artifact tags
            if (content.includes('<artifact>')) {
              inArtifact = true;
              const parts = content.split('<artifact>');
              if (parts[0]) {
                // Content before artifact tag
                console.log('Pre-artifact content:', parts[0]);
              }
              content = parts[1] || '';
            }

            if (content.includes('</artifact>')) {
              const parts = content.split('</artifact>');
              if (parts[0]) {
                artifactContent += parts[0];
              }
              inArtifact = false;
              
              // Set the complete artifact
              if (artifactContent) {
                console.log('Generated artifact:', artifactContent);
                setArtifact({
                  id: Date.now().toString(),
                  title: task.taskName,
                  content: artifactContent.trim(),
                  type: 'document',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
              
              if (parts[1]) {
                // Content after artifact tag
                console.log('Post-artifact content:', parts[1]);
              }
              continue;
            }

            if (inArtifact) {
              if (artifactContent && content !== '') {
                artifactContent += '\n';
              }
              artifactContent += content;
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer && inArtifact) {
        artifactContent += buffer;
        setArtifact({
          id: Date.now().toString(),
          title: task.taskName,
          content: artifactContent.trim(),
          type: 'document',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've generated the initial ${task.taskName} document. You can see it on the right side of your screen. Feel free to ask me to make any changes or refinements.`,
      };
      setMessages([assistantMessage]);

    } catch (error) {
      console.error('Error generating artifact:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error generating the initial document. Please try refreshing the page.',
      };
      setMessages([errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/artifact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          taskId: task.id,
          companyId: companyId,
          currentArtifact: artifact?.content,
          updateArtifact: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let artifactContent = '';
      let inArtifact = false;
      let assistantContent = '';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Extract content from streaming format
          let content = '';
          if (line.startsWith('0:')) {
            content = line.slice(2);
          } else if (line.startsWith('data: ')) {
            content = line.slice(6);
            if (content === '[DONE]') continue;
          } else if (line.startsWith(':')) {
            continue; // Skip comment lines
          } else {
            content = line;
          }

          if (content !== undefined) {
            // Check for artifact tags
            if (content.includes('<artifact>')) {
              inArtifact = true;
              artifactContent = ''; // Reset artifact content
              const parts = content.split('<artifact>');
              if (parts[0]) {
                // Content before artifact tag (explanation)
                assistantContent += parts[0];
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
              content = parts[1] || '';
            }

            if (content.includes('</artifact>')) {
              const parts = content.split('</artifact>');
              if (parts[0]) {
                artifactContent += parts[0];
              }
              inArtifact = false;
              
              // Set the complete artifact
              if (artifactContent) {
                console.log('Updated artifact:', artifactContent);
                setArtifact(prev => ({
                  id: prev?.id || Date.now().toString(),
                  title: task.taskName,
                  content: artifactContent.trim(),
                  type: 'document',
                  createdAt: prev?.createdAt || new Date(),
                  updatedAt: new Date(),
                }));
              }
              
              if (parts[1]) {
                // Content after artifact tag
                assistantContent += parts[1];
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
              continue;
            }

            if (inArtifact) {
              if (artifactContent && content !== '') {
                artifactContent += '\n';
              }
              artifactContent += content;
            } else if (content !== undefined && !inArtifact) {
              assistantContent += content;
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: assistantContent }
                    : msg
                )
              );
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer) {
        if (inArtifact) {
          artifactContent += buffer;
          setArtifact(prev => ({
            id: prev?.id || Date.now().toString(),
            title: task.taskName,
            content: artifactContent.trim(),
            type: 'document',
            createdAt: prev?.createdAt || new Date(),
            updatedAt: new Date(),
          }));
        } else {
          assistantContent += buffer;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: assistantContent }
                : msg
            )
          );
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

  const copyToClipboard = () => {
    if (artifact?.content) {
      navigator.clipboard.writeText(artifact.content);
    }
  };

  const downloadArtifact = () => {
    if (!artifact) return;
    
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      <div className="w-1/2 flex flex-col">
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="space-y-4">
            {isGenerating && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Generating initial document...</p>
                </div>
              </div>
            )}
            
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
                      <span className="text-sm text-muted-foreground">Updating document...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-background border-t pt-4">
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to update or refine the document..."
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
                  disabled={isLoading || !input.trim()}
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

      <div className="w-1/2 flex flex-col">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                {artifact?.title || task.taskName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'source')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="preview" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="source" className="text-xs">
                      <Code className="h-3 w-3 mr-1" />
                      Source
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={downloadArtifact}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Download document"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {artifact ? (
                  viewMode === 'preview' ? (
                    <div className="prose prose-base max-w-none dark:prose-invert 
                                      prose-headings:text-foreground prose-headings:font-semibold
                                      prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6
                                      prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-semibold
                                      prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold
                                      prose-p:text-muted-foreground prose-p:leading-7 prose-p:mb-4
                                      prose-strong:text-foreground prose-strong:font-semibold
                                      prose-ul:my-4 prose-ul:pl-6 prose-ul:text-muted-foreground
                                      prose-ol:my-4 prose-ol:pl-6 prose-ol:text-muted-foreground
                                      prose-li:mb-2 prose-li:text-muted-foreground prose-li:leading-relaxed
                                      prose-ul:prose-li:marker:text-muted-foreground
                                      prose-blockquote:border-l-4 prose-blockquote:border-l-muted prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic
                                      prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                                      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg
                                      prose-em:text-muted-foreground prose-em:italic
                                      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children, ...props }) => (
                            <h1 className="text-2xl font-bold text-foreground border-b border-border pb-3 mb-6 mt-0" {...props}>
                              {children}
                            </h1>
                          ),
                          h2: ({ children, ...props }) => (
                            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4 first:mt-0" {...props}>
                              {children}
                            </h2>
                          ),
                          h3: ({ children, ...props }) => (
                            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3" {...props}>
                              {children}
                            </h3>
                          ),
                          p: ({ children, ...props }) => (
                            <p className="text-muted-foreground leading-7 mb-4" {...props}>
                              {children}
                            </p>
                          ),
                          strong: ({ children, ...props }) => (
                            <strong className="font-semibold text-foreground" {...props}>
                              {children}
                            </strong>
                          ),
                          ul: ({ children, ...props }) => (
                            <ul className="my-4 pl-6 space-y-2 text-muted-foreground" {...props}>
                              {children}
                            </ul>
                          ),
                          ol: ({ children, ...props }) => (
                            <ol className="my-4 pl-6 space-y-2 text-muted-foreground" {...props}>
                              {children}
                            </ol>
                          ),
                          li: ({ children, ...props }) => (
                            <li className="text-muted-foreground leading-relaxed" {...props}>
                              {children}
                            </li>
                          ),
                          em: ({ children, ...props }) => (
                            <em className="italic text-muted-foreground" {...props}>
                              {children}
                            </em>
                          ),
                          blockquote: ({ children, ...props }) => (
                            <blockquote className="border-l-4 border-l-muted pl-4 my-4 italic text-muted-foreground" {...props}>
                              {children}
                            </blockquote>
                          ),
                          code({ className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const inline = !match;
                            return !inline ? (
                              <SyntaxHighlighter
                                style={oneDark as any}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg !mt-4 !mb-4"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-muted px-2 py-1 rounded text-sm font-mono" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {artifact.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-muted/50 p-4 rounded-lg">
                      {artifact.content}
                    </pre>
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No document generated yet.</p>
                    <p className="text-sm mt-2">Start a conversation to generate content.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}