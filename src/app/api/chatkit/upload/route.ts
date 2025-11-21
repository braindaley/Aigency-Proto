import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the vector store ID from the workflow's File Search configuration
// You'll need to set this in your .env.local file
const WORKFLOW_VECTOR_STORE_ID = process.env.OPENAI_WORKFLOW_VECTOR_STORE_ID;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID provided' },
        { status: 400 }
      );
    }

    console.log('Uploading file for session:', sessionId);

    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants',
    });

    console.log('File uploaded:', uploadedFile.id);

    //Add file to the workflow's vector store if configured
    if (WORKFLOW_VECTOR_STORE_ID) {
      try {
        // Note: This requires the vector_stores API which may not be available in all SDK versions
        // For now, we'll just upload the file and return success
        console.log('Vector store ID configured:', WORKFLOW_VECTOR_STORE_ID);
        console.log('File will need to be added to vector store manually or via API');
      } catch (vectorStoreError) {
        console.error('Vector store operation error:', vectorStoreError);
      }
    }

    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      filename: uploadedFile.filename,
      message: 'PDF uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
