import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const workflowId = process.env.OPENAI_WORKFLOW_ID;

// ChatKit API endpoint following the specification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, thread_id, message, attachments } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: 'OpenAI Workflow ID not configured' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'create_thread':
        // Create a new thread
        const thread = await openai.beta.threads.create();
        return NextResponse.json({
          thread_id: thread.id,
        });

      case 'send_message':
        // Send a message to the thread
        if (!thread_id || !message) {
          return NextResponse.json(
            { error: 'Thread ID and message are required' },
            { status: 400 }
          );
        }

        // Add the user message to the thread
        await openai.beta.threads.messages.create(thread_id, {
          role: 'user',
          content: message,
        });

        // Run the assistant on the thread
        const run = await openai.beta.threads.runs.createAndPoll(thread_id, {
          assistant_id: workflowId,
        });

        if (run.status === 'completed') {
          // Get the assistant's messages
          const messages = await openai.beta.threads.messages.list(thread_id);
          const assistantMessage = messages.data.find(
            (msg) => msg.role === 'assistant' && msg.run_id === run.id
          );

          if (assistantMessage && assistantMessage.content[0].type === 'text') {
            return NextResponse.json({
              response: assistantMessage.content[0].text.value,
              thread_id: thread_id,
            });
          }
        }

        return NextResponse.json(
          {
            error: 'Failed to get response',
            status: run.status,
          },
          { status: 500 }
        );

      case 'get_thread':
        // Get thread details
        if (!thread_id) {
          return NextResponse.json(
            { error: 'Thread ID is required' },
            { status: 400 }
          );
        }

        const messages = await openai.beta.threads.messages.list(thread_id);
        return NextResponse.json({
          thread_id: thread_id,
          messages: messages.data.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content:
              msg.content[0].type === 'text'
                ? msg.content[0].text.value
                : '',
            created_at: msg.created_at,
          })),
        });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('ChatKit API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
