'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubmissionStatusBadge, getStatusMessage } from '@/components/SubmissionStatusBadge';
import { Send, Mail, RefreshCw, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Submission } from '@/lib/types';
import { format } from 'date-fns';

interface TaskSubmissionsPanelProps {
  companyId: string;
  taskId: string;
  taskName: string;
  dependencyTaskIds?: string[];
}

export function TaskSubmissionsPanel({ companyId, taskId, taskName, dependencyTaskIds = [] }: TaskSubmissionsPanelProps) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, [companyId, taskId]);

  const loadSubmissions = async () => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const submissionsRef = collection(db, `companies/${companyId}/submissions`);
      // Remove orderBy to avoid composite index requirement
      // We'll sort in memory instead
      const q = query(
        submissionsRef,
        where('taskId', '==', taskId)
      );
      const snapshot = await getDocs(q);

      const submissionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];

      // Sort in memory by createdAt
      submissionsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime; // Descending order
      });

      setSubmissions(submissionsList);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubmissionsFromArtifacts = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/submissions/create-from-artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, taskId, taskName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create submissions');
      }

      toast({
        title: 'Success',
        description: `Created ${data.count} submission${data.count !== 1 ? 's' : ''}`
      });

      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create submissions',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const sendSubmission = async (submissionId: string, carrierName: string) => {
    setSending(submissionId);
    try {
      const response = await fetch('/api/submissions/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, submissionId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send submission');
      }

      toast({
        title: 'Email Sent!',
        description: `Submission sent to ${carrierName}`
      });

      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send submission',
        variant: 'destructive'
      });
    } finally {
      setSending(null);
    }
  };

  const sendAllSubmissions = async () => {
    setSendingAll(true);
    try {
      const response = await fetch('/api/submissions/send-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, taskId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send submissions');
      }

      toast({
        title: 'Submissions Sent!',
        description: `Sent ${data.sent} of ${data.total} submissions successfully`
      });

      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send submissions',
        variant: 'destructive'
      });
    } finally {
      setSendingAll(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const readyCount = submissions.filter(s => s.status === 'ready').length;
  const sentCount = submissions.filter(s => s.status === 'sent' || s.status === 'opened' || s.status === 'clicked' || s.status === 'replied').length;
  const openedCount = submissions.filter(s => s.status === 'opened' || s.status === 'clicked' || s.status === 'replied').length;
  const repliedCount = submissions.filter(s => s.status === 'replied').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Carrier Submissions</CardTitle>
            <CardDescription>
              Email submissions to insurance carriers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSubmissions} size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {submissions.length > 0 && readyCount > 0 && (
              <Button onClick={sendAllSubmissions} disabled={sendingAll}>
                {sendingAll ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send All ({readyCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No submissions created yet</p>
            <p className="text-sm text-muted-foreground">
              The AI will automatically create submissions from the carrier-specific emails
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Use the chat interface below to have the AI create and manage submissions
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            {sentCount > 0 && (
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{submissions.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{sentCount}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{openedCount}</div>
                  <div className="text-xs text-muted-foreground">Opened</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">{repliedCount}</div>
                  <div className="text-xs text-muted-foreground">Replied</div>
                </div>
              </div>
            )}

            {/* Submissions List */}
            <div className="space-y-3">
              {submissions.map(submission => (
                <div
                  key={submission.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{submission.carrierName}</h4>
                        <SubmissionStatusBadge status={submission.status} size="sm" />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="truncate">{submission.carrierEmail}</p>
                        <p className="truncate">{submission.subject}</p>
                      </div>
                      {submission.sentAt && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Sent {format(submission.sentAt.toDate(), 'MMM d, h:mm a')}
                          </span>
                          {submission.tracking && submission.tracking.opens > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {submission.tracking.opens} open{submission.tracking.opens !== 1 ? 's' : ''}
                            </span>
                          )}
                          {submission.replies.length > 0 && (
                            <span className="flex items-center gap-1 text-teal-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {submission.replies.length} repl{submission.replies.length !== 1 ? 'ies' : 'y'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      {(submission.status === 'ready' || submission.status === 'draft' || submission.status === 'failed') && (
                        <Button
                          size="sm"
                          onClick={() => sendSubmission(submission.id, submission.carrierName)}
                          disabled={sending === submission.id}
                        >
                          {sending === submission.id ? (
                            <>
                              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-3 w-3" />
                              Send
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
