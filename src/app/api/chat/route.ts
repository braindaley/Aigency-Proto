import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google('gemini-1.5-flash'),
    messages,
    system: 'You are a helpful AI assistant for an insurance agency management system. You help users manage companies, tasks, and renewals.',
  });

  return result.toTextStreamResponse();
}