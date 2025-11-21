'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, X, FileText } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

interface ChatKitElement extends HTMLElement {
  setOptions(options: any): void;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; id: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [vectorStoreId, setVectorStoreId] = useState<string | null>(null);

  useEffect(() => {
    console.log('useEffect running', {
      isScriptLoaded,
      hasRef: !!chatKitRef.current,
      isInitializing
    });

    if (!isScriptLoaded) {
      console.log('Script not loaded yet');
      return;
    }

    if (!chatKitRef.current) {
      console.log('chatKitRef.current is null, waiting for next render...');
      return;
    }

    if (isInitializing) {
      console.log('Already initializing');
      return;
    }

    setIsInitializing(true);

    const initializeChatKit = async () => {
      try {
        console.log('Initializing ChatKit...');

        // Initialize ChatKit with the getClientSecret function
        chatKitRef.current!.setOptions({
          api: {
            async getClientSecret(currentClientSecret: string | null) {
              console.log('getClientSecret called with:', currentClientSecret);

              // Create a session via our API endpoint
              const response = await fetch('/api/chatkit/create-session', {
                method: 'POST',
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error('Session creation failed:', errorData);
                throw new Error(errorData.error || 'Failed to create session');
              }

              const { client_secret } = await response.json();
              console.log('Session created successfully');

              return client_secret;
            },
          },
        });

        console.log('ChatKit initialized successfully');
      } catch (err) {
        console.error('Error initializing ChatKit:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize ChatKit');
        setIsInitializing(false);
      }
    };

    initializeChatKit();
  }, [isScriptLoaded, isInitializing]);

  const handleScriptLoad = () => {
    console.log('ChatKit script loaded successfully');
    setIsScriptLoaded(true);
  };

  const handleScriptError = (e: any) => {
    console.error('Failed to load ChatKit script:', e);
    setError('Failed to load ChatKit script from CDN.');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      // Generate session ID if not exists
      const currentSessionId = sessionId || `session_${Date.now()}`;
      if (!sessionId) {
        setSessionId(currentSessionId);
      }

      for (const file of Array.from(files)) {
        // Validate PDF
        if (file.type !== 'application/pdf') {
          setError(`${file.name} is not a PDF file. Only PDFs are supported.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', currentSessionId);

        const response = await fetch('/api/chatkit/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }

        const data = await response.json();
        setUploadedFiles(prev => [...prev, { name: file.name, id: data.fileId }]);

        // Store vector store ID for later use
        if (data.vectorStoreId) {
          setVectorStoreId(data.vectorStoreId);
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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

        {/* File Upload Section */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="pdf-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              size="sm"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload PDFs'}
            </Button>
            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md text-sm"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">{file.name}</span>
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {uploadedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {uploadedFiles.length} file(s) uploaded. Type a message to start the analysis.
            </p>
          )}
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            {!isScriptLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Loading chat...</p>
              </div>
            )}
            <openai-chatkit
              ref={chatKitRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                visibility: isScriptLoaded ? 'visible' : 'hidden',
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
