'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

// Define ChatKit interface
interface ChatKitOptions {
  workflowId?: string;
  api?: {
    baseUrl?: string;
  };
}

interface ChatKitElement extends HTMLElement {
  setOptions(options: ChatKitOptions): void;
  addEventListener(event: string, callback: (e: any) => void): void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'openai-chatkit': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export default function OpenAIAgentChatPage() {
  const chatKitRef = useRef<ChatKitElement | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isScriptLoaded || !chatKitRef.current) return;

    const workflowId = process.env.NEXT_PUBLIC_OPENAI_WORKFLOW_ID;

    if (!workflowId) {
      setError('Workflow ID not configured');
      return;
    }

    try {
      console.log('Initializing ChatKit with workflow ID:', workflowId);

      // Initialize ChatKit with setOptions method
      chatKitRef.current.setOptions({
        workflowId: workflowId,
      });

      // Listen for ready event
      chatKitRef.current.addEventListener('chatkit.ready', () => {
        console.log('ChatKit is ready');
      });

      // Listen for errors
      chatKitRef.current.addEventListener('chatkit.error', (e: any) => {
        console.error('ChatKit error:', e);
        setError(e.detail?.error?.message || 'ChatKit error occurred');
      });
    } catch (err) {
      console.error('Error initializing ChatKit:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    }
  }, [isScriptLoaded]);

  const handleScriptLoad = () => {
    console.log('ChatKit script loaded successfully');
    console.log('Workflow ID:', process.env.NEXT_PUBLIC_OPENAI_WORKFLOW_ID);
    setIsScriptLoaded(true);
  };

  const handleScriptError = (e: any) => {
    console.error('Failed to load ChatKit script:', e);
    setError('Failed to load ChatKit script from CDN. Please check your internet connection and refresh.');
  };

  return (
    <>
      <Script
        src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />

      <div className="h-screen flex flex-col">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/openai-agent-test">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Build Package Assistant</h1>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <p className="text-destructive mb-4">{error}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Note: ChatKit requires domain verification in your OpenAI organization settings.
                Make sure localhost:9003 is authorized.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : !isScriptLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        ) : (
          <div className="flex-1 relative">
            <openai-chatkit
              ref={chatKitRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
