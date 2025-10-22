/**
 * Firebase Cloud Functions for AI Task Processing
 *
 * This handles long-running AI task completion that would timeout on Netlify.
 * Firebase Cloud Functions have a 60-second default timeout (9 minutes on 2nd gen),
 * which is perfect for AI processing tasks.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const {GoogleGenerativeAI} = require('@google/generative-ai');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540, // 9 minutes (max for 2nd gen)
  memory: '512MiB',
});

/**
 * Process AI Task - Main Cloud Function
 * Called from the frontend to process AI tasks in the background
 */
exports.processAITask = onCall(
  {
    cors: true, // Allow CORS from any origin (you can restrict this to your domain)
  },
  async (request) => {
    const {taskId, companyId} = request.data;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 🤖 CLOUD-FUNCTION: Processing AI task ${taskId}`);

    if (!taskId || !companyId) {
      throw new HttpsError('invalid-argument', 'Missing taskId or companyId');
    }

    // Create job status document
    const jobRef = db.collection('aiTaskJobs').doc(taskId);
    await jobRef.set({
      taskId,
      companyId,
      status: 'processing',
      progress: 'Starting AI task processing...',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // Get Google AI API key from environment
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
      }

      // Fetch task details
      await updateJobStatus(jobRef, 'processing', 'Loading task details...');
      const taskDoc = await db.collection('companyTasks').doc(taskId).get();

      if (!taskDoc.exists) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const task = {id: taskDoc.id, ...taskDoc.data()};
      console.log(`[${timestamp}] 📝 Task: "${task.taskName}"`);

      // Verify it's an AI task
      if (task.tag !== 'ai') {
        throw new Error(`Not an AI task (tag: ${task.tag})`);
      }

      // Get context (simplified version - you can import the full DataService)
      await updateJobStatus(jobRef, 'processing', 'Gathering company data...');
      const context = await getTaskContext(companyId, taskId);

      // Get system prompt
      let systemPrompt = task.systemPrompt || '';
      if (!systemPrompt && task.taskName) {
        await updateJobStatus(jobRef, 'processing', 'Loading task template...');
        const templates = await db.collection('tasks')
            .where('taskName', '==', task.taskName)
            .get();

        if (!templates.empty) {
          const template = templates.docs[0].data();
          systemPrompt = template.systemPrompt || '';
        }
      }

      if (!systemPrompt) {
        systemPrompt = 'You are an AI assistant that automatically completes insurance tasks using available company data.';
      }

      // Generate AI response
      await updateJobStatus(jobRef, 'processing', 'Generating AI response...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({model: 'gemini-2.0-flash-exp'});

      const prompt = `${systemPrompt}\n\nTask: ${task.taskName}\nDescription: ${task.description}\n\nAvailable Context:\n${context}\n\nPlease complete this task and wrap your response in <artifact> tags.`;

      const aiResult = await model.generateContent(prompt);
      const response = await aiResult.response;
      const fullText = response.text();

      console.log(`[${timestamp}] ✅ AI response generated (${fullText.length} chars)`);

      // Extract artifacts
      const artifactMatches = fullText.matchAll(/<artifact(?:\s+id="([^"]+)")?>([\s\S]*?)<\/artifact>/g);
      const artifacts = [];

      for (const match of artifactMatches) {
        const artifactId = match[1];
        const artifactContent = match[2].trim();
        if (artifactContent.length > 100) {
          artifacts.push({id: artifactId, content: artifactContent});
        }
      }

      const hasArtifact = artifacts.length > 0;

      // Save chat message
      await updateJobStatus(jobRef, 'processing', 'Saving results...');
      let chatContent = fullText.replace(/<artifact(?:\s+id="[^"]+")?>[\s\S]*?<\/artifact>/g, '').trim();

      if (!chatContent && hasArtifact) {
        chatContent = artifacts.length > 1 ?
          `I've generated ${artifacts.length} documents for ${task.taskName}.` :
          `I've generated the ${task.taskName} document.`;
      }

      const chatRef = db.collection('taskChats').doc(taskId).collection('messages');
      await chatRef.add({
        role: 'assistant',
        content: chatContent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isAIGenerated: true,
        completedAutomatically: true,
        hasArtifact,
      });

      // Save artifacts
      if (hasArtifact) {
        const artifactsRef = db.collection(`companies/${companyId}/artifacts`);

        for (let i = 0; i < artifacts.length; i++) {
          const artifact = artifacts[i];
          await artifactsRef.add({
            name: artifact.id || `${task.taskName} (${i + 1}/${artifacts.length})`,
            type: 'text',
            data: artifact.content,
            description: `AI-generated artifact for task: ${task.taskName}`,
            taskId,
            taskName: task.taskName,
            tags: [task.phase, task.tag, 'ai-canvas', 'ai-generated', 'auto-saved'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Mark task as completed (simplified - add validation if needed)
      await updateJobStatus(jobRef, 'processing', 'Completing task...');
      await db.collection('companyTasks').doc(taskId).update({
        status: 'completed',
        completedBy: 'AI System',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark job as completed
      await updateJobStatus(jobRef, 'completed', 'Task completed successfully!');

      console.log(`[${timestamp}] 🎉 Task completed successfully`);

      return {
        success: true,
        taskId,
        artifactsGenerated: artifacts.length,
      };
    } catch (error) {
      console.error(`[${timestamp}] ❌ Error processing task:`, error);

      await updateJobStatus(
          jobRef,
          'failed',
          error.message || 'Unknown error occurred',
      );

      throw new HttpsError('internal', error.message || 'Failed to process AI task');
    }
  },
);

/**
 * Helper function to update job status
 */
async function updateJobStatus(jobRef, status, progress) {
  await jobRef.update({
    status,
    progress,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Simplified context gathering (you can make this more sophisticated)
 */
async function getTaskContext(companyId, taskId) {
  try {
    // Get company documents
    const docsSnapshot = await db.collection(`companies/${companyId}/documents`).limit(10).get();

    let context = '';
    docsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.processedText) {
        context += `\n\n=== ${data.name} ===\n${data.processedText.substring(0, 5000)}\n`;
      }
    });

    return context || 'No additional context available.';
  } catch (error) {
    console.error('Error getting context:', error);
    return 'Error loading context.';
  }
}
