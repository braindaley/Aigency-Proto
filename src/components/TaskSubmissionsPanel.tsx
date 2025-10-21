'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SubmissionStatusBadge, getStatusMessage } from '@/components/SubmissionStatusBadge';
import { Send, Mail, RefreshCw, Eye, Clock, CheckCircle2, Paperclip, Edit2, Save, X } from 'lucide-react';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<{ subject: string; body: string }>({ subject: '', body: '' });

  useEffect(() => {
    loadSubmissions();
  }, [companyId, taskId]);

  // Auto-select first submission when loaded
  useEffect(() => {
    if (submissions.length > 0 && !selectedId) {
      setSelectedId(submissions[0].id);
    }
  }, [submissions, selectedId]);

  const loadSubmissions = async () => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const submissionsRef = collection(db, `companies/${companyId}/submissions`);
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
        return bTime - aTime;
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

      // Check if all submissions are now sent, and if so, mark task as complete
      const updatedSubmissionsRef = collection(await import('@/lib/firebase').then(m => m.db), `companies/${companyId}/submissions`);
      const { query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
      const q = firestoreQuery(updatedSubmissionsRef, where('taskId', '==', taskId));
      const snapshot = await getDocs(q);

      const allSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const allSent = allSubmissions.every((s: any) => s.status === 'sent');

      if (allSent && allSubmissions.length > 0) {
        console.log('🎉 All submissions sent, marking task as completed');
        try {
          const { doc: firestoreDoc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');

          // Update metadata first
          const taskRef = firestoreDoc(db, 'companyTasks', taskId);
          await updateDoc(taskRef, {
            updatedAt: new Date()
          });

          // Use the API endpoint to mark as completed, which will trigger dependent tasks
          const response = await fetch('/api/update-task-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: taskId,
              status: 'completed'
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update task status');
          }

          toast({
            title: 'Task Completed!',
            description: 'All follow-up emails have been sent'
          });

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (error) {
          console.error('Failed to mark task as completed:', error);
          toast({
            title: 'Error',
            description: 'Submissions sent but task status update failed',
            variant: 'destructive'
          });
        }
      }
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
        description: `Sent ${data.sent} of ${data.total} submissions successfully${data.taskCompleted ? ' - Task completed!' : ''}`
      });

      await loadSubmissions();

      // If task was marked as completed, reload the page to show updated status
      if (data.taskCompleted) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
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

  const startEditing = (submission: Submission) => {
    setEditingId(submission.id);
    setEditedContent({
      subject: submission.subject,
      body: submission.body
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedContent({ subject: '', body: '' });
  };

  const saveEdits = async (submissionId: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const submissionRef = doc(db, `companies/${companyId}/submissions`, submissionId);
      await updateDoc(submissionRef, {
        subject: editedContent.subject,
        body: editedContent.body,
        updatedAt: new Date()
      });

      toast({
        title: 'Saved',
        description: 'Email content updated successfully'
      });

      setEditingId(null);
      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive'
      });
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

  const selectedSubmission = submissions.find(s => s.id === selectedId);

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] bg-background">
      {/* Left Panel - Submissions List */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
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
                  <Button onClick={sendAllSubmissions} disabled={sendingAll} size="sm">
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
          <CardContent className="flex-1 overflow-y-auto">
            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No submissions created yet</p>
                <p className="text-sm text-muted-foreground">
                  The AI will automatically create submissions from the carrier-specific emails
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

                {/* Email Thread List - Grouped by Carrier */}
                <div className="space-y-1">
                  {(() => {
                    // Group submissions by carrier name (normalize by removing "Follow Up" suffix)
                    const groupedByCarrier = submissions.reduce((acc, submission) => {
                      let carrierName = submission.carrierName || 'Unknown Carrier';
                      // Normalize carrier name by removing common suffixes
                      carrierName = carrierName
                        .replace(/\s+Follow\s+Up$/i, '')
                        .replace(/\s+Insurance\s+Group$/i, '')
                        .trim();

                      if (!acc[carrierName]) {
                        acc[carrierName] = [];
                      }
                      acc[carrierName].push(submission);
                      return acc;
                    }, {} as Record<string, Submission[]>);

                    return Object.entries(groupedByCarrier).map(([carrierName, carrierSubmissions]) => (
                      <div key={carrierName} className="border-b last:border-b-0">
                        {/* Carrier Header */}
                        <div className="font-bold text-sm px-3 py-2 bg-muted/30">
                          {carrierName}
                        </div>

                        {/* Email Thread */}
                        <div className="divide-y">
                          {carrierSubmissions.map((submission) => (
                            <div
                              key={submission.id}
                              onClick={() => setSelectedId(submission.id)}
                              className={`px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer ${
                                selectedId === submission.id ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-muted-foreground">
                                    {submission.replies && submission.replies.length > 0 ? 'Re:' : 'To:'}
                                  </span>
                                  <span className="truncate">{submission.subject || 'Workers\' Compensation Submission'}</span>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <SubmissionStatusBadge status={submission.status} size="sm" />
                                  {submission.sentAt && (
                                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                                      {format(submission.sentAt.toDate(), 'MMM d')}
                                    </span>
                                  )}
                                  {submission.replies && submission.replies.length > 0 && (
                                    <span className="flex items-center gap-1 text-teal-600 text-xs">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {submission.replies.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Email Preview/Edit */}
      <div className="w-1/2 flex flex-col">
        {selectedSubmission ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{selectedSubmission.carrierName}</CardTitle>
                  <CardDescription className="truncate">{selectedSubmission.carrierEmail}</CardDescription>
                </div>
                <div className="flex gap-2 ml-4">
                  {editingId !== selectedSubmission.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(selectedSubmission)}
                      >
                        <Edit2 className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      {(selectedSubmission.status === 'ready' || selectedSubmission.status === 'draft' || selectedSubmission.status === 'failed') && (
                        <Button
                          size="sm"
                          onClick={() => sendSubmission(selectedSubmission.id, selectedSubmission.carrierName)}
                          disabled={sending === selectedSubmission.id}
                        >
                          {sending === selectedSubmission.id ? (
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
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="mr-2 h-3 w-3" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdits(selectedSubmission.id)}
                      >
                        <Save className="mr-2 h-3 w-3" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {editingId === selectedSubmission.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={editedContent.subject}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, subject: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Body</label>
                    <Textarea
                      value={editedContent.body}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, body: e.target.value }))}
                      className="mt-1 min-h-[400px] font-mono text-sm"
                    />
                  </div>
                  {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Attachments</label>
                      <div className="mt-2 space-y-1">
                        {selectedSubmission.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Subject</div>
                    <div className="text-sm">{selectedSubmission.subject}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Body</div>
                    <div className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded border">
                      {selectedSubmission.body}
                    </div>
                  </div>
                  {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Attachments</div>
                      <div className="space-y-1">
                        {selectedSubmission.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <CardContent>
              <div className="text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an email to preview</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
