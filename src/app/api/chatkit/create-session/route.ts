import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const workflowId = process.env.OPENAI_WORKFLOW_ID;
    const domainKey = process.env.OPENAI_DOMAIN_KEY;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!workflowId || !domainKey || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Create a session with OpenAI
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
      },
      body: JSON.stringify({
        workflow: {
          id: workflowId,
        },
        user: 'user_' + Date.now(), // Generate a unique user ID for each session
        chatkit_configuration: {
          file_upload: {
            enabled: true,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ChatKit session creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create ChatKit session', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Session created:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      client_secret: data.client_secret,
    });
  } catch (error) {
    console.error('Error creating ChatKit session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
