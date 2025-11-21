import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
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

    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants',
    });

    // Create a vector store if the assistant doesn't have one
    let vectorStore;
    try {
      const assistant = await openai.beta.assistants.retrieve(assistantId);

      if (!assistant.tool_resources?.file_search?.vector_store_ids?.length) {
        // Create a new vector store
        vectorStore = await openai.beta.vectorStores.create({
          name: 'Build Package Files',
        });

        // Update assistant to use this vector store
        await openai.beta.assistants.update(assistantId, {
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStore.id],
            },
          },
        });
      } else {
        // Use existing vector store
        const vectorStoreId = assistant.tool_resources.file_search.vector_store_ids[0];
        vectorStore = await openai.beta.vectorStores.retrieve(vectorStoreId);
      }

      // Add file to vector store
      await openai.beta.vectorStores.files.create(vectorStore.id, {
        file_id: uploadedFile.id,
      });

      return NextResponse.json({
        success: true,
        fileId: uploadedFile.id,
        filename: uploadedFile.filename,
        vectorStoreId: vectorStore.id,
        message: 'File uploaded and added to knowledge base successfully.',
      });
    } catch (err) {
      console.error('Error setting up vector store:', err);
      // Still return success for file upload even if vector store attachment fails
      return NextResponse.json({
        success: true,
        fileId: uploadedFile.id,
        filename: uploadedFile.filename,
        message: 'File uploaded successfully, but may need manual attachment to vector store.',
        warning: err instanceof Error ? err.message : 'Vector store setup failed',
      });
    }
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
