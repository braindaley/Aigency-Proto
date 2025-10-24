'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownComponentProps {
  children?: React.ReactNode;
  className?: string;
}

const markdownComponents = {
  h1: ({ children }: MarkdownComponentProps) => (
    <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>
  ),
  h2: ({ children }: MarkdownComponentProps) => (
    <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>
  ),
  h3: ({ children }: MarkdownComponentProps) => (
    <h3 className="text-lg font-semibold mb-2 text-foreground">{children}</h3>
  ),
  h4: ({ children }: MarkdownComponentProps) => (
    <h4 className="text-base font-semibold mb-2 text-foreground">{children}</h4>
  ),
  h5: ({ children }: MarkdownComponentProps) => (
    <h5 className="text-sm font-semibold mb-2 text-foreground">{children}</h5>
  ),
  h6: ({ children }: MarkdownComponentProps) => (
    <h6 className="text-xs font-semibold mb-2 text-foreground">{children}</h6>
  ),
  p: ({ children }: MarkdownComponentProps) => (
    <p className="mb-3 leading-relaxed text-foreground">{children}</p>
  ),
  ul: ({ children }: MarkdownComponentProps) => (
    <ul className="list-disc pl-6 mb-4 space-y-1 text-foreground">{children}</ul>
  ),
  ol: ({ children }: MarkdownComponentProps) => (
    <ol className="list-decimal pl-6 mb-4 space-y-1 text-foreground">{children}</ol>
  ),
  li: ({ children }: MarkdownComponentProps) => (
    <li className="mb-1 text-foreground">{children}</li>
  ),
  blockquote: ({ children }: MarkdownComponentProps) => (
    <blockquote className="border-l-4 border-border pl-4 italic my-4 bg-muted/50 py-2 rounded-r text-muted-foreground">
      {children}
    </blockquote>
  ),
  table: ({ children }: MarkdownComponentProps) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: MarkdownComponentProps) => (
    <thead className="bg-muted">{children}</thead>
  ),
  tbody: ({ children }: MarkdownComponentProps) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: MarkdownComponentProps) => (
    <tr className="border-b border-border">{children}</tr>
  ),
  th: ({ children }: MarkdownComponentProps) => (
    <th className="border border-border px-4 py-2 bg-muted font-semibold text-left text-foreground">
      {children}
    </th>
  ),
  td: ({ children }: MarkdownComponentProps) => (
    <td className="border border-border px-4 py-2 text-foreground">
      {children}
    </td>
  ),
  strong: ({ children }: MarkdownComponentProps) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: MarkdownComponentProps) => (
    <em className="italic text-foreground">{children}</em>
  ),
  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-border" />,
  code({ node, inline, className, children, ...props }: any) {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    };

    if (!inline && match) {
      return (
        <div className="my-4 relative group w-full max-w-full">
          <div className="absolute right-2 top-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="w-full max-w-full overflow-x-auto rounded-lg bg-muted border border-border" style={{ maxWidth: '100%' }}>
            <pre className="!m-0 !p-4 text-sm leading-relaxed text-foreground overflow-x-auto" style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
              whiteSpace: 'pre',
              overflowX: 'auto',
              maxWidth: '100%'
            }}>
              <code>{code}</code>
            </pre>
          </div>
        </div>
      );
    }

    return (
      <code
        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: MarkdownComponentProps) => {
    // Let the code component handle pre tags
    return <>{children}</>;
  },
};

interface PartialMarkdownRendererProps {
  content: string;
  className?: string;
}

function PartialMarkdownRenderer({ content, className = "" }: PartialMarkdownRendererProps) {
  const processedContent = useMemo(() => {
    // Handle incomplete code blocks during streaming
    const codeBlockMatches = content.match(/```/g) || [];
    const codeBlockCount = codeBlockMatches.length;
    
    // If odd number of code blocks, close the last one
    if (codeBlockCount % 2 === 1) {
      return content + '\n```';
    }
    
    return content;
  }, [content]);

  return (
    <div className={`max-w-full overflow-hidden ${className}`}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

// Enhanced version that auto-detects markdown
function SmartMessageRenderer({ content, role }: { content: string; role: string }) {
  const hasMarkdownIndicators = useMemo(() => {
    // More comprehensive markdown detection
    const indicators = [
      /^#{1,6}\s+/m,           // Headers
      /\*\*[^*]+\*\*/,         // Bold
      /\*[^*\n]+\*/,           // Italic
      /`[^`\n]+`/,             // Inline code
      /```[\s\S]*?```/,        // Code blocks
      /^\s*[-*+]\s+/m,         // Unordered lists
      /^\s*\d+\.\s+/m,         // Ordered lists
      /^\s*>\s+/m,             // Blockquotes
      /\[[^\]]*\]\([^)]*\)/,   // Links
      /\|[^|]*\|/,             // Tables
      /^---+$/m,               // Horizontal rules
    ];
    
    return indicators.some(pattern => pattern.test(content));
  }, [content]);
  
  // Always use markdown for assistant messages or when markdown indicators are found
  if (role === 'assistant' || hasMarkdownIndicators) {
    return <PartialMarkdownRenderer content={content} />;
  }
  
  // For user messages without markdown, use simple pre-wrap formatting
  return (
    <div className="whitespace-pre-wrap text-foreground leading-relaxed max-w-full overflow-hidden break-words">
      {content}
    </div>
  );
}

// Simple markdown renderer without auto-detection
function MarkdownRenderer({ content, className = "" }: PartialMarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { PartialMarkdownRenderer, SmartMessageRenderer, MarkdownRenderer, markdownComponents };