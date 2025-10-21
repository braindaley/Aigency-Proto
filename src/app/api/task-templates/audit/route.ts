import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TemplateAuditLog {
  id?: string;
  templateId: string;
  templateName: string;
  action: 'create' | 'update' | 'delete';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  userId?: string;
  userEmail?: string;
  timestamp: Date;
  metadata?: {
    ip?: string;
    userAgent?: string;
    source?: string;
  };
}

/**
 * POST /api/task-templates/audit
 * Log a template change to the audit trail
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, templateName, action, changes, userId, userEmail, metadata } = body;

    if (!templateId || !action) {
      return NextResponse.json(
        { error: 'Template ID and action are required' },
        { status: 400 }
      );
    }

    // Create audit log entry
    const auditLog: Omit<TemplateAuditLog, 'id'> = {
      templateId,
      templateName: templateName || 'Unknown Template',
      action,
      changes: changes || [],
      userId: userId || 'system',
      userEmail: userEmail || 'system@aigency.com',
      timestamp: new Date(),
      metadata: {
        ...metadata,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    };

    // Add to Firestore
    const auditRef = collection(db, 'templateAuditLogs');
    const docRef = await addDoc(auditRef, {
      ...auditLog,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Audit log created for template ${templateId}: ${action}`);

    return NextResponse.json({
      success: true,
      auditId: docRef.id,
      message: `Audit log created for ${action} action`,
    });

  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/task-templates/audit
 * Retrieve audit logs for templates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('templateId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const limitCount = parseInt(searchParams.get('limit') || '100');

    // Build query
    const auditRef = collection(db, 'templateAuditLogs');
    let q = query(auditRef);

    // Add filters
    const constraints = [];

    if (templateId) {
      constraints.push(where('templateId', '==', templateId));
    }

    if (userId) {
      constraints.push(where('userId', '==', userId));
    }

    if (action) {
      constraints.push(where('action', '==', action));
    }

    // Add ordering and limit
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount));

    // Apply all constraints
    if (constraints.length > 0) {
      q = query(auditRef, ...constraints);
    }

    // Execute query
    const snapshot = await getDocs(q);
    const auditLogs: TemplateAuditLog[] = [];

    snapshot.forEach((doc) => {
      auditLogs.push({
        id: doc.id,
        ...doc.data(),
      } as TemplateAuditLog);
    });

    return NextResponse.json({
      success: true,
      count: auditLogs.length,
      logs: auditLogs,
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}