import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Create a new thread for the conversation
    const thread = await openai.beta.threads.create();

    return NextResponse.json({
      threadId: thread.id,
      success: true,
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      {
        error: 'Failed to create thread',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
