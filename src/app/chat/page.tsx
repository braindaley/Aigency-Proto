import { ChatInterface } from '@/components/chat-interface';

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Chat with your AI assistant to help manage companies, tasks, and renewals
        </p>
      </div>
      
      <ChatInterface />
    </div>
  );
}