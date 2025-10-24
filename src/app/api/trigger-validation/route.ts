import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

// Helper function to validate task completion (copied from chat/task route)
async function validateTaskCompletion(messages: any[], testCriteria: string, latestResponse: string = '') {
  console.log('=== MANUAL VALIDATION TRIGGER ===');
  console.log('Latest response:', latestResponse);
  
  // Collect all documents from the conversation
  const allDocuments: any[] = [];
  messages.forEach((msg: any) => {
    if (msg.documents && Array.isArray(msg.documents)) {
      allDocuments.push(...msg.documents);
    }
  });
  
  console.log('Found documents:', allDocuments.length);
  allDocuments.forEach((doc, idx) => {
    console.log(`Document ${idx}:`, {
      filename: doc.filename,
      contentLength: doc.content?.length,
      contentPreview: doc.content?.substring(0, 200)
    });
  });

  // Manual validation logic based on actual criteria
  let hasEmployeeData = false;
  let hasJobDescriptions = false;
  let hasHighRiskIdentification = false;

  // Check documents for required information
  for (const doc of allDocuments) {
    const content = doc.content?.toLowerCase() || '';
    const filename = doc.filename?.toLowerCase() || '';
    
    // Check for employee data - expand criteria to include payroll, classification, etc.
    if (content.includes('employee') && (content.includes('name') || content.includes('title')) ||
        content.includes('payroll') || content.includes('classification') || 
        filename.includes('payroll') || filename.includes('employee') ||
        (content.includes(',') && (content.includes('title') || content.includes('name') || content.includes('department')))) {
      hasEmployeeData = true;
    }
    
    // Check for job descriptions - expand to include classification descriptions
    if (content.includes('job') && (content.includes('description') || content.includes('responsibilities')) ||
        content.includes('classification') && content.includes('description') ||
        content.includes('operations') || content.includes('clerical') || content.includes('warehouse') ||
        content.includes('drivers') || content.includes('commercial')) {
      hasJobDescriptions = true;
    }
    
    // Check for risk identification - expand to include rate information and premium data
    if (content.includes('risk') && (content.includes('high') || content.includes('assessment')) ||
        content.includes('rate per') || content.includes('premium') ||
        content.includes('workers compensation') || content.includes('workers comp')) {
      hasHighRiskIdentification = true;
    }

    // Special handling for payroll classification documents
    if (filename.includes('payroll') && filename.includes('classification') ||
        content.includes('class code') && content.includes('payroll')) {
      hasEmployeeData = true;
      hasJobDescriptions = true;
      hasHighRiskIdentification = true;
    }
  }

  // Also check the latest AI response for completion indicators
  const responseContent = latestResponse.toLowerCase();
  const hasCompletionIndicator = responseContent.includes('completed') || responseContent.includes('all criteria') || responseContent.includes('successfully') ||
      responseContent.includes('task complete!') || responseContent.includes('✅') || 
      responseContent.includes('ready for insurance submission') || responseContent.includes('all required information');
  
  console.log('Completion indicator check:', { 
    hasCompletionIndicator, 
    responsePreview: responseContent.substring(0, 150),
    hasTaskComplete: responseContent.includes('task complete!'),
    hasCheckmark: responseContent.includes('✅'),
    hasEmployeeData: responseContent.includes('employee data'),
    hasJobTitles: responseContent.includes('job titles'),
    fullResponse: latestResponse
  });
  
  const validationDetails = {
    hasEmployeeData,
    hasJobDescriptions,
    hasHighRiskIdentification,
    hasCompletionIndicator
  };

  const missingCriteria: string[] = [];
  if (!hasEmployeeData) {
    missingCriteria.push('employee data or payroll details');
  }
  if (!hasJobDescriptions) {
    missingCriteria.push('job descriptions');
  }
  if (!hasHighRiskIdentification) {
    missingCriteria.push('high-risk roles or loss information');
  }

  if (hasCompletionIndicator) {
    console.log('AI completion indicator found - marking as COMPLETED', validationDetails);
    return { overallStatus: 'COMPLETED', details: validationDetails, missingCriteria: [] };
  }

  // Calculate overall status
  const criteriaCount = [hasEmployeeData, hasJobDescriptions, hasHighRiskIdentification].filter(Boolean).length;
  
  console.log('Validation results:', {
    hasEmployeeData,
    hasJobDescriptions,
    hasHighRiskIdentification,
    criteriaCount,
    responseContent: latestResponse.toLowerCase().substring(0, 100)
  });
  
  if (criteriaCount >= 2) { // At least 2 out of 3 criteria met
    return { overallStatus: 'COMPLETED', details: validationDetails, missingCriteria: [] };
  } else if (criteriaCount > 0) {
    return { overallStatus: 'PARTIALLY_COMPLETED', details: validationDetails, missingCriteria };
  } else {
    return { overallStatus: 'NOT_COMPLETED', details: validationDetails, missingCriteria };
  }
}

// Helper function to update task status
async function updateTaskStatus(taskId: string, status: string) {
  // Use the update-task-status endpoint to ensure dependency logic is triggered
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9003'}/api/update-task-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, status }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to update task status via API:', error);
    // Fallback to direct database update if API call fails
    const taskDocRef = doc(db, 'companyTasks', taskId);
    await updateDoc(taskDocRef, {
      status: status,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId' },
        { status: 400 }
      );
    }

    console.log(`Manual validation trigger for task ${taskId}`);

    // Fetch task details
    const taskDocRef = doc(db, 'companyTasks', taskId);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    if (!task.testCriteria) {
      return NextResponse.json(
        { error: 'Task has no test criteria' },
        { status: 400 }
      );
    }

    // Get chat messages for this task
    const chatRef = collection(db, 'taskChats', taskId, 'messages');
    const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
    const chatSnapshot = await getDocs(chatQuery);
    
    const messages = chatSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${messages.length} messages in taskChats/${taskId}/messages`);
    messages.forEach((msg, idx) => {
      console.log(`Message ${idx}:`, {
        role: msg.role,
        contentLength: msg.content?.length,
        hasDocuments: !!msg.documents,
        documentsCount: msg.documents?.length || 0,
        timestamp: msg.timestamp
      });
    });
    
    // Get the latest assistant response
    const latestAssistantMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant');
    const latestResponse = latestAssistantMessage?.content || '';
    
    const validationResult = await validateTaskCompletion(
      messages,
      task.testCriteria,
      latestResponse
    );

    console.log('Manual validation result:', validationResult);

    // If task is completed, update status
    if (validationResult.overallStatus === 'COMPLETED') {
      await updateTaskStatus(taskId, 'completed');
      console.log(`Task ${taskId} manually marked as completed`);
    }

    return NextResponse.json({
      success: true,
      taskId,
      taskName: task.taskName,
      currentStatus: task.status,
      validationResult,
      messagesCount: messages.length,
      documentsFound: messages.reduce((acc, msg) => acc + (msg.documents?.length || 0), 0)
    });

  } catch (error) {
    console.error('Manual validation trigger error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
