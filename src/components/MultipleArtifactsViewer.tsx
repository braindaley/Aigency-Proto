'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Eye, Code, Copy, Download, Database, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';

interface Artifact {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'code' | 'markdown';
  createdAt: Date;
  updatedAt: Date;
  savedToDatabase?: boolean;
  databaseId?: string;
}

interface MultipleArtifactsViewerProps {
  artifacts: Artifact[];
  theme?: 'light' | 'dark';
  isSavingToDatabase?: boolean;
  onDownload?: (artifact: Artifact) => void;
  onCopy?: (artifact: Artifact) => void;
}

export function MultipleArtifactsViewer({
  artifacts,
  theme = 'light',
  isSavingToDatabase = false,
  onDownload,
  onCopy
}: MultipleArtifactsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  if (artifacts.length === 0) {
    return null;
  }

  const currentArtifact = artifacts[currentIndex];
  const hasMultiple = artifacts.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : artifacts.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < artifacts.length - 1 ? prev + 1 : 0));
  };

  const handleCopy = () => {
    if (onCopy && currentArtifact) {
      onCopy(currentArtifact);
    } else if (currentArtifact) {
      navigator.clipboard.writeText(currentArtifact.content);
    }
  };

  const handleDownload = () => {
    if (onDownload && currentArtifact) {
      onDownload(currentArtifact);
    } else if (currentArtifact) {
      const blob = new Blob([currentArtifact.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentArtifact.title.replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="flex flex-col h-full bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasMultiple && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevious}
                  title="Previous carrier"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  {currentIndex + 1} / {artifacts.length}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNext}
                  title="Next carrier"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-2" />
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSavingToDatabase && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {currentArtifact?.databaseId ? 'Updating...' : 'Saving to database...'}
                </>
              )}
              {currentArtifact?.savedToDatabase && !isSavingToDatabase && (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  <Database className="h-3 w-3 text-green-600" />
                  Synced
                </>
              )}
            </div>
          </div>
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
              onClick={handleCopy}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleDownload}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Download document"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {currentArtifact && (
          <div className="text-sm font-medium text-foreground mt-2">
            {currentArtifact.title}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 bg-background">
        <ScrollArea className="h-full bg-background">
          <div className="p-6 bg-background" style={{ backgroundColor: 'var(--background)' }}>
            {currentArtifact && viewMode === 'preview' ? (
              <div className="prose prose-base max-w-none
                              prose-headings:text-foreground prose-headings:font-semibold
                              prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6
                              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-semibold
                              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold
                              prose-p:text-foreground prose-p:leading-7 prose-p:mb-4
                              prose-strong:text-foreground prose-strong:font-semibold
                              prose-ul:my-4 prose-ul:pl-6 prose-ul:text-foreground
                              prose-ol:my-4 prose-ol:pl-6 prose-ol:text-foreground
                              prose-li:mb-2 prose-li:text-foreground prose-li:leading-relaxed
                              prose-blockquote:border-l-4 prose-blockquote:border-l-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:italic
                              prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-foreground
                              prose-pre:bg-transparent prose-pre:p-0
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
                      <p className="text-foreground leading-7 mb-4" {...props}>
                        {children}
                      </p>
                    ),
                    strong: ({ children, ...props }) => (
                      <strong className="font-semibold text-foreground" {...props}>
                        {children}
                      </strong>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="my-4 pl-6 space-y-2 text-foreground list-disc" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="my-4 pl-6 space-y-2 text-foreground list-decimal" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }) => (
                      <li className="text-foreground leading-relaxed" {...props}>
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
                          style={(theme === 'dark' ? oneDark : oneLight) as any}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-lg !mt-4 !mb-4"
                          customStyle={{
                            backgroundColor: theme === 'dark' ? 'rgb(40, 44, 52)' : 'rgb(250, 250, 250)',
                            margin: 0
                          }}
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
                  {currentArtifact.content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-background text-foreground p-4 rounded-lg">
                {currentArtifact?.content}
              </pre>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
