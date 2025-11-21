import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { threadId, message } = await req.json();

    if (!threadId || !message) {
      return NextResponse.json(
        { error: 'Thread ID and message are required' },
        { status: 400 }
      );
    }

    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'OpenAI Assistant ID not configured' },
        { status: 500 }
      );
    }

    // Add the user message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });

    // Run the assistant on the thread and wait for completion
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    if (run.status === 'completed') {
      // Get the assistant's messages
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessages = messages.data.filter(
        msg => msg.role === 'assistant' && msg.run_id === run.id
      );

      return NextResponse.json({
        success: true,
        messages: assistantMessages,
        runId: run.id,
      });
    } else {
      return NextResponse.json(
        {
          error: 'Run failed',
          status: run.status,
          lastError: run.last_error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
