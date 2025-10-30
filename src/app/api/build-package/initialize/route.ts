import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

// Task IDs from workers-comp-tasks-complete.json for tasks 1-9
const SUBMISSION_TASK_IDS = [
  'Q41BkK5qUnMaZ0waRRla', // Task 1: Request employee count & job descriptions
  'RQlrE8SxH5S1Dmz9Fcep', // Task 2: Request payroll by classification
  'Yc1t3K3v5Rj3SMoGMhlu', // Task 3: Request loss runs (3–5 years)
  'vJmLwiZom1tIJZTL3uAG', // Task 4: Research public info (OSHA data, company site)
  'qMkNQITF8u7nvts7troM', // Task 5: Complete ACORD 130
  'Z1YTH2FkhrcrAnvyvu1H', // Task 6: Complete ACORD 125
  'm08S186qdxKgnxZ32cGH', // Task 7: Write narrative
  'JIwJvXLzaoEiZx09UfiN', // Task 8: Generate coverage suggestions
  'uAqsk1Hcbzerb6oriO49', // Task 9: Finalize and approve submission package
];

export async function POST(req: NextRequest) {
  try {
    const { companyId, renewalType } = await req.json();

    if (!companyId || !renewalType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get company data
    const companyRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);

    if (!companyDoc.exists()) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data();

    // Get renewal date for this renewal type
    const renewal = companyData.renewals?.find((r: any) => r.type === renewalType);
    const renewalDate = renewal?.date || Timestamp.now();

    // Check if there's an existing workflow for this company and renewal type
    const workflowsRef = collection(db, 'buildPackageWorkflows');
    const existingQuery = query(
      workflowsRef,
      where('companyId', '==', companyId),
      where('renewalType', '==', renewalType),
      where('status', '==', 'in_progress')
    );
    const existingWorkflows = await getDocs(existingQuery);

    if (!existingWorkflows.empty) {
      // Check if existing workflow has valid taskIds
      const existingWorkflow = existingWorkflows.docs[0];
      const existingData = existingWorkflow.data();

      if (existingData.taskIds && existingData.taskIds.length > 0) {
        // Return existing workflow if it has tasks
        return NextResponse.json({
          workflowId: existingWorkflow.id,
          ...existingData,
        });
      }
      // If taskIds is empty, continue to create a new workflow
      console.log('Existing workflow has empty taskIds, creating new workflow');
    }

    // Create company tasks for this workflow (tasks 1-9)
    const taskIds: string[] = [];
    const taskNames = [
      'Request employee count & job descriptions',
      'Request payroll by classification',
      'Request loss runs (3–5 years)',
      'Research public info (OSHA data, company site)',
      'Complete ACORD 130 - Workers\' Compensation Application',
      'Complete ACORD 125 – Commercial Insurance Application',
      'Write narrative',
      'Generate coverage suggestions',
      'Finalize and approve submission package'
    ];

    for (let i = 0; i < SUBMISSION_TASK_IDS.length; i++) {
      const templateId = SUBMISSION_TASK_IDS[i];

      // Fetch template data from Firestore to copy all fields
      const templateRef = doc(db, 'tasks', templateId);
      const templateDoc = await getDoc(templateRef);

      let templateData = {};
      if (templateDoc.exists()) {
        templateData = templateDoc.data();
        console.log(`Loaded template for ${taskNames[i]}, has testCriteria: ${!!templateData.testCriteria}`);
      } else {
        console.warn(`Template ${templateId} not found in Firestore, using minimal data`);
      }

      // Create company task with data from template
      const taskRef = await addDoc(collection(db, 'companyTasks'), {
        taskName: taskNames[i],
        companyId,
        renewalType: renewalType,
        renewalDate,
        templateId,
        policyType: 'workers-comp',
        phase: i < 3 ? 'Submission' : i < 4 ? 'Submission' : 'Submission',
        tag: i < 3 ? 'manual' : 'ai',
        status: 'Upcoming',
        dependencies: [],
        sortOrder: i + 1,
        // Copy important fields from template
        description: templateData.description || '',
        systemPrompt: templateData.systemPrompt || '',
        testCriteria: templateData.testCriteria || null,
        showDependencyArtifacts: templateData.showDependencyArtifacts || false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      taskIds.push(taskRef.id);
      console.log(`Created task ${i + 1}: ${taskNames[i]} with ID ${taskRef.id}`);
    }

    // Create initial workflow state
    const initialMessage = {
      role: 'assistant',
      content: "Let's build your Workers' Compensation submission package! To get started, please upload the following documents:\n\n1. **Employee count & job descriptions** - Details about your employees and their roles\n\n2. **Payroll by classification** - Payroll data broken down by classification codes\n\n3. **Loss runs (3-5 years)** - Your historical claims data\n\nYou can drag and drop multiple files at once, or click the upload button below.",
      timestamp: Timestamp.now(),
    };

    const workflowRef = await addDoc(collection(db, 'buildPackageWorkflows'), {
      companyId,
      renewalType,
      phase: 'upload',
      taskIds,
      uploadedDocuments: {},
      chatHistory: [initialMessage],
      status: 'in_progress',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      workflowId: workflowRef.id,
      taskIds,
      phase: 'upload',
    });
  } catch (error) {
    console.error('Error initializing build package workflow:', error);
    return NextResponse.json(
      { error: 'Failed to initialize workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
