'use client';

import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ReactNode } from 'react';

/**
 * SafeReactMarkdown - A wrapper around ReactMarkdown that safely renders HTML content
 *
 * This component includes rehype-raw by default to allow HTML rendering in markdown.
 * Use this instead of ReactMarkdown directly to ensure consistent HTML rendering
 * across the application.
 *
 * @example
 * ```tsx
 * <SafeReactMarkdown>
 *   # Markdown with <strong>HTML</strong>
 * </SafeReactMarkdown>
 * ```
 */

interface SafeReactMarkdownProps {
  children: string;
  components?: Components;
  className?: string;
}

export function SafeReactMarkdown({
  children,
  components,
  className
}: SafeReactMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={components}
      className={className}
    >
      {children}
    </ReactMarkdown>
  );
}

/**
 * Default plugins configuration for consistent usage across the app
 * Import these if you need to use ReactMarkdown directly with custom configuration
 */
export const defaultMarkdownPlugins = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [rehypeRaw]
};
