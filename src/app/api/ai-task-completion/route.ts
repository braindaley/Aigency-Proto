import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DataService } from '@/lib/data-service';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Google AI API key is not configured');
    }

    const { taskId, companyId } = await request.json();

    if (!taskId || !companyId) {
      return NextResponse.json(
        { error: 'Missing taskId or companyId' },
        { status: 400 }
      );
    }

    // Fetch the AI task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Verify this is an AI task
    if (task.tag !== 'ai') {
      return NextResponse.json(
        { error: 'This endpoint only processes AI tasks' },
        { status: 400 }
      );
    }

    // Get all available context (company info, completed tasks, documents, artifacts)
    const context = await DataService.getAITaskContext(companyId);

    // Build comprehensive prompt for AI task completion
    const systemPrompt = `You are an AI assistant that automatically completes insurance tasks using available company data and previous task artifacts.

TASK TO COMPLETE:
- Task Name: ${task.taskName}
- Description: ${task.description}
- Phase: ${task.phase}
- Type: ${task.tag}

${task.systemPrompt || ''}

AVAILABLE CONTEXT:
${context.relevantContent}

INSTRUCTIONS:
1. Analyze the task requirements and available data
2. Use the documents and artifacts from previous tasks to complete this task
3. Generate a comprehensive response that fulfills the task requirements
4. If generating a document, wrap it in <artifact> tags
5. Provide a clear summary of what was completed
6. Be thorough and professional in your response

Your response should directly complete the task using the available information. If you need additional information that's not available, mention what's missing.`;

    // Process the task with AI
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      prompt: `Please complete the task "${task.taskName}" using all the available company data and previous task artifacts shown in the context above.`,
      temperature: 0.3, // Lower temperature for more consistent results
    });

    // Create a chat message with the AI completion
    const chatMessage = {
      role: 'assistant',
      content: result.text,
      timestamp: new Date(),
      isAIGenerated: true,
      usedDocuments: context.allDocuments.length,
      usedArtifacts: context.allArtifacts.length,
      completedAutomatically: true
    };

    // Save the AI completion to the task chat
    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    await addDoc(chatRef, chatMessage);

    // Check if the AI response indicates task completion
    const responseContent = result.text.toLowerCase();
    const hasArtifact = result.text.includes('<artifact>');
    const indicatesCompletion = responseContent.includes('completed') || 
                               responseContent.includes('finished') || 
                               responseContent.includes('done') ||
                               hasArtifact;

    // Auto-complete the task if it seems finished
    if (indicatesCompletion) {
      await updateDoc(taskDocRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedBy: 'AI System'
      });

      // Trigger dependency updates
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9002'}/api/update-task-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId, status: 'completed' }),
        });
      } catch (error) {
        console.error('Failed to trigger dependency updates:', error);
      }
    }

    return NextResponse.json({
      success: true,
      taskCompleted: indicatesCompletion,
      aiResponse: result.text,
      documentsUsed: context.allDocuments.length,
      artifactsUsed: context.allArtifacts.length,
      completedTasksReferenced: context.completedTasks.length
    });

  } catch (error) {
    console.error('AI task completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete AI task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check AI task completion readiness
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    const companyId = searchParams.get('companyId');

    if (!taskId || !companyId) {
      return NextResponse.json(
        { error: 'Missing taskId or companyId' },
        { status: 400 }
      );
    }

    // Get task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    // Check if this is an AI task
    if (task.tag !== 'ai') {
      return NextResponse.json({
        canComplete: false,
        reason: 'Task is not marked as AI-enabled'
      });
    }

    // Get available context
    const context = await DataService.getAITaskContext(companyId);

    // Assess readiness
    const hasDocuments = context.allDocuments.length > 0;
    const hasArtifacts = context.allArtifacts.length > 0;
    const hasCompletedTasks = context.completedTasks.length > 0;
    
    const canComplete = hasDocuments || hasArtifacts || hasCompletedTasks;
    const readinessScore = (hasDocuments ? 40 : 0) + (hasArtifacts ? 40 : 0) + (hasCompletedTasks ? 20 : 0);

    return NextResponse.json({
      canComplete,
      readinessScore,
      availableResources: {
        documents: context.allDocuments.length,
        artifacts: context.allArtifacts.length,
        completedTasks: context.completedTasks.length
      },
      recommendations: canComplete ? [
        'AI can complete this task using available company data'
      ] : [
        'No previous tasks or documents available for AI completion',
        'Consider completing some manual tasks first to build context'
      ]
    });

  } catch (error) {
    console.error('AI readiness check error:', error);
    return NextResponse.json(
      { error: 'Failed to check AI readiness' },
      { status: 500 }
    );
  }
}