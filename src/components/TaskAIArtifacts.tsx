'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, User, Send, Download, Copy, FileText, Code, Eye, Loader2, Database, Check, RefreshCw } from 'lucide-react';
import { CompanyTask } from '@/lib/types';
import { saveArtifactToDatabase, saveMultipleArtifacts } from '@/lib/artifact-utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';
import { SmartMessageRenderer } from '@/components/MarkdownRenderer';
import { parseMultipleArtifacts, extractContentWithoutArtifacts } from '@/lib/artifact-parser';
import { MultipleArtifactsViewer } from '@/components/MultipleArtifactsViewer';
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
  savedToDatabase?: boolean;
  databaseId?: string;
}

interface TaskAIArtifactsProps {
  task: CompanyTask;
  companyId: string;
}

export function TaskAIArtifacts({ task, companyId }: TaskAIArtifactsProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  // Helper function to convert JSON to readable markdown
  const jsonToMarkdown = (obj: any, level: number = 1): string => {
    let markdown = '';

    const formatKey = (key: string): string => {
      // Convert snake_case or camelCase to Title Case
      return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim();
    };

    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return '*Not provided*';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toLocaleString();
      return String(value);
    };

    if (Array.isArray(obj)) {
      // Handle arrays
      if (obj.length === 0) return '*None*\n\n';

      // Check if array contains objects with consistent structure (table candidate)
      if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) {
        // Try to render as table
        const keys = Object.keys(obj[0]);
        if (keys.length > 0 && keys.length <= 6) {
          markdown += '| ' + keys.map(formatKey).join(' | ') + ' |\n';
          markdown += '| ' + keys.map(() => '---').join(' | ') + ' |\n';
          obj.forEach(item => {
            markdown += '| ' + keys.map(k => formatValue(item[k])).join(' | ') + ' |\n';
          });
          markdown += '\n';
          return markdown;
        }
      }

      // Otherwise render as list
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          markdown += `${index + 1}. **Item ${index + 1}**\n\n`;
          markdown += jsonToMarkdown(item, level + 1);
        } else {
          markdown += `- ${formatValue(item)}\n`;
        }
      });
      markdown += '\n';
      return markdown;
    }

    if (typeof obj === 'object' && obj !== null) {
      // Handle objects
      Object.entries(obj).forEach(([key, value]) => {
        const formattedKey = formatKey(key);

        if (value === null || value === undefined || value === '') {
          markdown += `**${formattedKey}:** *Not provided*\n\n`;
        } else if (Array.isArray(value)) {
          markdown += `${'#'.repeat(Math.min(level + 1, 6))} ${formattedKey}\n\n`;
          markdown += jsonToMarkdown(value, level + 1);
        } else if (typeof value === 'object') {
          markdown += `${'#'.repeat(Math.min(level + 1, 6))} ${formattedKey}\n\n`;
          markdown += jsonToMarkdown(value, level + 1);
        } else {
          markdown += `**${formattedKey}:** ${formatValue(value)}\n\n`;
        }
      });
      return markdown;
    }

    return formatValue(obj) + '\n\n';
  };

  // Helper function to detect and format JSON content
  const formatJsonIfNeeded = (content: string): { isJson: boolean; formatted: string; markdown?: string } => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      // If successful, convert to markdown
      const markdownContent = jsonToMarkdown(parsed);
      return {
        isJson: true,
        formatted: JSON.stringify(parsed, null, 2),
        markdown: markdownContent
      };
    } catch (e) {
      // Check if content looks like JSON but has markdown formatting (```json...```)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const markdownContent = jsonToMarkdown(parsed);
          return {
            isJson: true,
            formatted: JSON.stringify(parsed, null, 2),
            markdown: markdownContent
          };
        } catch (e2) {
          // Not valid JSON
        }
      }

      // Check if content starts with just "json" (without code fence) followed by actual JSON
      const jsonPrefixMatch = content.match(/^json\s*(\{[\s\S]*\})\s*$/);
      if (jsonPrefixMatch) {
        try {
          const parsed = JSON.parse(jsonPrefixMatch[1]);
          const markdownContent = jsonToMarkdown(parsed);
          return {
            isJson: true,
            formatted: JSON.stringify(parsed, null, 2),
            markdown: markdownContent
          };
        } catch (e3) {
          // Not valid JSON
        }
      }

      return { isJson: false, formatted: content };
    }
  };

  const storageKey = `task-artifact-${companyId}-${task.id}`;
  const chatStorageKey = `task-artifact-chat-${companyId}-${task.id}`;

  // Process message content to replace artifact tags with brief summaries
  const processMessageForDisplay = (content: string, taskName: string): string => {
    // Use the extractContentWithoutArtifacts function to remove all artifact tags
    const contentWithoutArtifacts = extractContentWithoutArtifacts(content);

    // If content was changed (had artifacts), and there's not much left, add a summary
    if (contentWithoutArtifacts !== content && contentWithoutArtifacts.trim().length < 50) {
      return `Based on the information provided and data in the database, I have created the ${taskName}.`;
    }

    return contentWithoutArtifacts;
  };

  useEffect(() => {
    // Check for dark mode
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Load messages and artifacts from Firebase first (for auto-executed tasks)
    loadFromFirebase();

    // Set up real-time listener for new messages
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeListener = async () => {
      try {
        const { collection: firestoreCollection, query: firestoreQuery, orderBy, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const messagesRef = firestoreCollection(db, 'taskChats', task.id, 'messages');
        const q = firestoreQuery(messagesRef, orderBy('timestamp', 'asc'));

        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            console.log(`🔄 Real-time update: ${snapshot.size} messages`);

            const firebaseMessages: ChatMessage[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                role: data.role || 'assistant',
                content: data.content || ''
              };
            });

            setMessages(firebaseMessages);

            // For auto-completed tasks, artifacts are loaded from database - don't extract from messages
            const wasAutoCompleted = task.status === 'completed' && (task as any).completedBy === 'AI System';

            if (!wasAutoCompleted) {
              // Extract artifacts from messages if present (only for manual/chat-based tasks)
              const fullContent = firebaseMessages.map(m => m.content).join('\n');

              // Try to parse multiple artifacts first
              const parsedArtifacts = parseMultipleArtifacts(fullContent);

              if (parsedArtifacts.length > 0) {
                console.log(`📝 Found ${parsedArtifacts.length} artifacts from real-time listener`);

                // Keep ALL artifacts for multi-artifact tasks
                const artifactObjects: Artifact[] = parsedArtifacts.map(parsed => ({
                  id: parsed.id,
                  title: parsed.title,
                  content: parsed.content,
                  type: 'document' as const,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  savedToDatabase: false
                }));

                setArtifacts(artifactObjects);
                setArtifact(artifactObjects[0]); // Set first as current
              }
            } else {
              console.log(`⏭️ Auto-completed task - skipping artifact extraction from messages (using database artifacts only)`);
            }
          }
        });
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
      }
    };

    setupRealtimeListener();

    return () => {
      observer.disconnect();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [task.id, companyId]);

  const loadFromFirebase = async () => {
    try {
      // Import Firebase functions
      const { collection: firestoreCollection, getDocs, query: firestoreQuery, orderBy, where } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      // First, check if there's an artifact in the artifacts collection
      console.log('Checking artifacts collection for taskId:', task.id);
      const artifactsRef = firestoreCollection(db, `companies/${companyId}/artifacts`);
      const artifactsSnapshot = await getDocs(artifactsRef);

      // Find ALL artifacts for this task (support multi-artifact tasks)
      const taskArtifactDocs = artifactsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.taskId === task.id;
      });

      if (taskArtifactDocs.length > 0) {
        console.log(`Found ${taskArtifactDocs.length} artifact(s) in database for task ${task.id}`);

        // Convert all task artifacts to Artifact objects
        const artifactObjects: Artifact[] = taskArtifactDocs.map(taskArtifact => {
          const artifactData = taskArtifact.data();
          return {
            id: taskArtifact.id,
            title: artifactData.name || task.taskName,
            content: artifactData.data || '',
            type: 'document' as const,
            createdAt: artifactData.createdAt?.toDate?.() || new Date(),
            updatedAt: artifactData.updatedAt?.toDate?.() || new Date(),
            savedToDatabase: true,
            databaseId: taskArtifact.id
          };
        });

        // Sort by artifactIndex if available (for multi-artifact tasks)
        artifactObjects.sort((a, b) => {
          const aData = taskArtifactDocs.find(doc => doc.id === a.id)?.data();
          const bData = taskArtifactDocs.find(doc => doc.id === b.id)?.data();
          const aIndex = aData?.artifactIndex ?? 0;
          const bIndex = bData?.artifactIndex ?? 0;
          return aIndex - bIndex;
        });

        // Set the artifacts array for display
        setArtifacts(artifactObjects);

        // Set the first artifact as the current one
        setArtifact(artifactObjects[0]);

        setLastSavedContent(artifactObjects[0].content || '');
      }

      // Check if there are messages in Firebase from automatic execution
      const messagesRef = firestoreCollection(db, 'taskChats', task.id, 'messages');
      const q = firestoreQuery(messagesRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log(`Found ${snapshot.size} messages from automatic execution`);

        // Load messages from Firebase
        const firebaseMessages: ChatMessage[] = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            role: data.role || 'assistant',
            content: data.content || ''
          };
        });

        setMessages(firebaseMessages);

        // Only extract artifact from messages if we didn't find one in the artifacts collection
        // For auto-executed tasks, we should always use the database artifact, not chat artifacts
        const wasAutoCompleted = task.status === 'completed' && (task as any).completedBy === 'AI System';

        if (taskArtifactDocs.length === 0 && !wasAutoCompleted) {
          const fullContent = firebaseMessages.map(m => m.content).join('\n');

          // Try to parse multiple artifacts first
          const parsedArtifacts = parseMultipleArtifacts(fullContent);

          if (parsedArtifacts.length > 0) {
            console.log(`📝 Found ${parsedArtifacts.length} artifacts from loadFromFirebase`);

            // Keep ALL artifacts for multi-artifact tasks
            const artifactObjects: Artifact[] = parsedArtifacts.map(parsed => ({
              id: parsed.id,
              title: parsed.title,
              content: parsed.content,
              type: 'document' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
              savedToDatabase: false
            }));

            setArtifacts(artifactObjects);
            setArtifact(artifactObjects[0]); // Set first as current
          } else {
            // Fallback to single artifact without attributes
            const artifactMatch = fullContent.match(/<artifact>([\s\S]*?)<\/artifact>/);

            if (artifactMatch && artifactMatch[1]) {
              const artifactContent = artifactMatch[1].trim();
              console.log('Extracted artifact from chat messages:', artifactContent.substring(0, 200));

              setArtifact({
                id: Date.now().toString(),
                title: task.taskName,
                content: artifactContent,
                type: 'document',
                createdAt: new Date(),
                updatedAt: new Date(),
                savedToDatabase: false
              });
            }
          }
        }

        // Don't generate initial artifact if we loaded from Firebase
        return;
      }

      // Fallback to localStorage if no Firebase messages
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

      if (!savedArtifact && !savedMessages) {
        // Generate initial artifact only if nothing is saved anywhere
        generateInitialArtifact();
      }

    } catch (error) {
      console.error('Error loading from Firebase:', error);

      // Fallback to generating initial artifact
      generateInitialArtifact();
    }
  };

  useEffect(() => {
    if (artifact) {
      localStorage.setItem(storageKey, JSON.stringify(artifact));
      
      // Automatically save/update to database when content actually changes
      if (artifact.content.trim() && artifact.content !== lastSavedContent) {
        saveArtifactToDb(artifact);
      }
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

  // Auto-save multiple artifacts when they're first loaded
  useEffect(() => {
    if (artifacts.length > 1 && !isSavingToDatabase) {
      // Check if any artifact needs to be saved
      const needsSaving = artifacts.some(a => !a.savedToDatabase);
      if (needsSaving) {
        console.log(`📝 Auto-saving ${artifacts.length} multiple artifacts to database`);
        saveMultipleArtifactsToDb();
      }
    }
  }, [artifacts.length]);

  const saveArtifactToDb = async (artifactToSave: Artifact) => {
    if (isSavingToDatabase) return; // Only prevent if currently saving

    console.log('🔧 Saving artifact with databaseId:', artifactToSave.databaseId);
    setIsSavingToDatabase(true);
    try {
      const databaseId = await saveArtifactToDatabase({
        companyId,
        taskId: task.id,
        taskName: task.taskName,
        title: artifactToSave.title,
        content: artifactToSave.content,
        type: artifactToSave.type,
        description: `AI canvas artifact for ${task.taskName}`,
        tags: ['ai-canvas', task.phase, task.tag],
        databaseId: artifactToSave.databaseId // Pass existing ID for updates
      });

      // Update the artifact to mark it as saved
      const updatedArtifact = {
        ...artifactToSave,
        savedToDatabase: true,
        databaseId
      };

      setArtifact(updatedArtifact);
      localStorage.setItem(storageKey, JSON.stringify(updatedArtifact));
      setLastSavedContent(artifactToSave.content);

      const action = artifactToSave.databaseId ? 'updated' : 'created';
      console.log(`✅ Artifact automatically ${action} in database:`, databaseId);

      // If we got a different databaseId back, it means the original was deleted and recreated
      if (artifactToSave.databaseId && databaseId !== artifactToSave.databaseId) {
        console.log('🔄 Artifact was recreated with new ID, updating references');
      }
    } catch (error) {
      console.error('❌ Failed to save artifact to database:', error);
    } finally {
      setIsSavingToDatabase(false);
    }
  };

  const saveMultipleArtifactsToDb = async () => {
    if (isSavingToDatabase || artifacts.length === 0) return;

    console.log(`🔧 Saving ${artifacts.length} artifacts to database`);
    setIsSavingToDatabase(true);
    try {
      await saveMultipleArtifacts({
        companyId,
        taskId: task.id,
        taskName: task.taskName,
        artifacts: artifacts.map(a => ({
          id: a.id,
          title: a.title,
          content: a.content
        })),
        type: 'document',
        description: `Multiple carrier submission emails for ${task.taskName}`,
        tags: ['ai-canvas', task.phase, task.tag]
      });

      console.log(`✅ Successfully saved ${artifacts.length} artifacts to database`);
    } catch (error) {
      console.error('❌ Failed to save multiple artifacts:', error);
    } finally {
      setIsSavingToDatabase(false);
    }
  };

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

          // Skip empty lines
          if (!line.trim()) continue;

          // Handle different streaming formats
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
                  savedToDatabase: false
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
          savedToDatabase: false
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

    // Save user message to Firebase so it persists on refresh
    try {
      const { collection: firestoreCollection, addDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const chatRef = firestoreCollection(db, 'taskChats', task.id, 'messages');
      await addDoc(chatRef, {
        role: 'user',
        content: userMessage.content,
        timestamp: new Date(),
        isUserMessage: true
      });
      console.log('✅ User message saved to Firebase');
    } catch (error) {
      console.error('❌ Failed to save user message to Firebase:', error);
    }

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

          // Skip empty lines
          if (!line.trim()) continue;

          // Handle different streaming formats
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
                  savedToDatabase: prev?.savedToDatabase || false,
                  databaseId: prev?.databaseId
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
            } else if (content !== undefined && content !== '' && !inArtifact) {
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
            savedToDatabase: prev?.savedToDatabase || false,
            databaseId: prev?.databaseId
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

  const regenerateDocument = async () => {
    // Clear current artifact and messages
    setArtifact(null);
    setMessages([]);
    
    // Clear localStorage
    localStorage.removeItem(storageKey);
    localStorage.removeItem(chatStorageKey);
    
    // Regenerate the document
    await generateInitialArtifact();
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] bg-background">
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
                    className={`rounded-lg px-4 py-3 overflow-hidden bg-muted text-foreground`}
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
                        <div className="rounded-full bg-muted-foreground/30 h-2 w-2"></div>
                        <div className="rounded-full bg-muted-foreground/30 h-2 w-2"></div>
                        <div className="rounded-full bg-muted-foreground/30 h-2 w-2"></div>
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
        {artifacts.length > 1 ? (
          <MultipleArtifactsViewer
            artifacts={artifacts.map(a => ({
              id: a.id,
              title: a.title,
              content: a.content
            }))}
            theme={theme}
            isSavingToDatabase={isSavingToDatabase}
            isRegenerating={isGenerating || isLoading}
            onRegenerate={regenerateDocument}
            onDownload={(artifact) => {
              const blob = new Blob([artifact.content], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            onCopy={(artifact) => {
              navigator.clipboard.writeText(artifact.content);
            }}
          />
        ) : (
          <Card className="flex flex-col h-full bg-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isSavingToDatabase && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {artifact?.databaseId ? 'Updating...' : 'Saving to database...'}
                    </>
                  )}
                  {artifact?.savedToDatabase && !isSavingToDatabase && (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      <Database className="h-3 w-3 text-green-600" />
                      {artifact?.databaseId ? 'Synced' : 'Saved to database'}
                    </>
                  )}
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
                    onClick={regenerateDocument}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Regenerate document from template"
                    disabled={isGenerating || isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${(isGenerating || isLoading) ? 'animate-spin' : ''}`} />
                  </Button>
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
            <CardContent className="flex-1 overflow-hidden p-0 bg-background">
              <ScrollArea className="h-full bg-background">
                <div className="p-6 bg-background" style={{ backgroundColor: 'var(--background)' }}>
                  {artifact ? (
                  (() => {
                    const { isJson, formatted, markdown } = formatJsonIfNeeded(artifact.content);

                    // For preview mode, use the content as-is (markdown or converted JSON)
                    const contentToRender = (isJson && markdown) ? markdown : artifact.content;

                    return viewMode === 'preview' ? (
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
                        {contentToRender}
                      </ReactMarkdown>
                    </div>
                    ) : (
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-background text-foreground p-4 rounded-lg">
                        {isJson ? formatted : artifact.content}
                      </pre>
                    );
                  })()
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
        )}
      </div>
    </div>
  );
}