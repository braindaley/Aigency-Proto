import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This endpoint creates or retrieves an assistant with file search capabilities
export async function POST(req: NextRequest) {
  try {
    // Check if we already have an assistant ID stored
    const existingAssistantId = process.env.OPENAI_ASSISTANT_ID;

    if (existingAssistantId) {
      // Verify the assistant exists
      try {
        const assistant = await openai.beta.assistants.retrieve(existingAssistantId);
        return NextResponse.json({
          assistantId: assistant.id,
          name: assistant.name,
          existing: true,
        });
      } catch (error) {
        console.log('Existing assistant not found, creating new one...');
      }
    }

    // Create a new assistant with file search
    const assistant = await openai.beta.assistants.create({
      name: 'Build Package Assistant',
      instructions: 'You are a helpful assistant that helps users build insurance packages. You have access to uploaded documents and can search through them to answer questions and help build comprehensive insurance packages.',
      model: 'gpt-4-turbo-preview',
      tools: [{ type: 'file_search' }],
    });

    return NextResponse.json({
      assistantId: assistant.id,
      name: assistant.name,
      existing: false,
      message: `Created new assistant. Add this to your .env.local: OPENAI_ASSISTANT_ID="${assistant.id}"`,
    });
  } catch (error) {
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      {
        error: 'Failed to create assistant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
