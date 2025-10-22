# Firebase Cloud Functions for AI Task Processing

## Problem
Netlify's free tier has a **10-second timeout limit** for serverless functions, but AI task processing takes 20-60 seconds. This causes 504 timeouts.

## Solution
Use **Firebase Cloud Functions** which have:
- **9-minute timeout** on 2nd generation functions
- **Free tier**: 2M invocations/month, 400K GB-seconds compute time
- Already integrated with your Firebase project

## What Was Created

### 1. Firebase Cloud Function (`functions/index.js`)
- Handles long-running AI task processing
- Updates job status in Firestore in real-time
- Called from your Next.js app via Firebase SDK

### 2. Function Configuration (`functions/package.json`)
- Dependencies: `firebase-functions`, `firebase-admin`, `@google/generative-ai`
- Node 20 runtime
- Deployment scripts

### 3. Firebase Config (`firebase.json`)
- Added `functions` section
- Points to `functions/` directory

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd functions
npm install
```

### Step 2: Set API Key
Copy your Google AI API key to `functions/.env`:
```
GOOGLE_GENERATIVE_AI_API_KEY=your-actual-api-key-here
```

You can find this key in your `.env.local` file.

### Step 3: Deploy to Firebase
```bash
# From project root
firebase deploy --only functions

# Or deploy with environment variables
firebase functions:config:set google.ai_key="your-api-key"
firebase deploy --only functions
```

### Step 4: Update Frontend to Call Cloud Function

In `src/components/TaskDependencyArtifacts.tsx`, replace the API call with Firebase callable function:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// At the top of your component
const functions = getFunctions();
const processAITask = httpsCallable(functions, 'processAITask');

// Replace the fetch call with:
const response = await processAITask({
  taskId: task.id,
  companyId: companyId,
});
```

## How It Works

```
User triggers AI task
       ↓
Frontend calls Firebase Cloud Function
       ↓
Cloud Function:
  - Creates job status in Firestore { status: 'processing' }
  - Fetches task details
  - Gathers company context
  - Calls Google AI API (can take 20-60s)
  - Saves artifacts
  - Marks task complete
  - Updates job status { status: 'completed' }
       ↓
Frontend Firestore listener detects change → Shows notification
```

## Benefits

✅ **No timeout issues** - 9 minutes vs 10 seconds
✅ **Free** - Stays within Firebase free tier
✅ **Real-time progress** - Frontend tracks via Firestore
✅ **Works with existing code** - Minimal changes needed
✅ **Scalable** - Handles concurrent requests

## Cost Estimate

Based on your usage:
- **Function invocations**: ~100/month = FREE (2M limit)
- **Compute time**: ~30s per task × 100 = 3K GB-seconds = FREE (400K limit)
- **Firestore**: Already using

**Total additional cost: $0/month**

## Testing

1. Deploy the function
2. Update frontend to call it
3. Navigate to any AI task on Netlify
4. Watch the Firestore job status update in real-time
5. Verify task completes successfully

## Troubleshooting

### Function doesn't deploy
- Check `firebase login` is authenticated
- Ensure Cloud Functions API is enabled in Google Cloud Console
- Check billing is enabled (required even for free tier)

### Function times out
- Check Google AI API key is set correctly
- View logs: `firebase functions:log`
- Increase timeout in `functions/index.js` (already set to 540s)

### API key not working
- Ensure `.env` file is in `functions/` directory
- Verify the key works locally first
- Use Firebase config instead: `firebase functions:config:set`

## Alternative: Use Netlify Pro

If you prefer not to use Cloud Functions:
- Upgrade to Netlify Pro ($20/month)
- Gets 26-second timeout (vs 10s free tier)
- Might still timeout for complex tasks

## Questions?

Check Firebase Cloud Functions docs: https://firebase.google.com/docs/functions
