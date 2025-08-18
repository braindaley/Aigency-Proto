'use client';

import { useChat } from 'ai/react';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';
import { Message } from '@/components/ai-elements/message';
import { PromptInput } from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { Card } from '@/components/ui/card';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-3xl mx-auto">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start a conversation by typing a message below
            </div>
          )}
          
          {messages.map((message) => (
            <Message
              key={message.id}
              role={message.role}
              className="mb-4"
            >
              {message.role === 'assistant' ? (
                <Response>{message.content}</Response>
              ) : (
                <div className="prose dark:prose-invert">{message.content}</div>
              )}
            </Message>
          ))}
          
          {isLoading && (
            <Message role="assistant" className="mb-4">
              <Loader />
            </Message>
          )}
        </ConversationContent>
      </Conversation>
      
      <div className="border-t p-4">
        <form onSubmit={handleSubmit}>
          <PromptInput
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="w-full"
          />
        </form>
      </div>
    </Card>
  );
}