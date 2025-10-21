'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, Eye, Clock, CheckCircle2, RefreshCw, Filter, Paperclip, Edit2, Save, X } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Submission, SubmissionStatus } from '@/lib/types';
import { SubmissionStatusBadge } from '@/components/SubmissionStatusBadge';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

export default function CompanyEmailsPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Auto-select first submission when loaded
  useEffect(() => {
    if (filteredSubmissions.length > 0 && !selectedId) {
      setSelectedId(filteredSubmissions[0].id);
    }
  }, [submissions, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load company name
      const companyRef = doc(db, 'companies', companyId || '');
      const companyDoc = await getDoc(companyRef);
      if (companyDoc.exists()) {
        setCompanyName(companyDoc.data().name || '');
      }

      // Load all submissions for this company
      const submissionsRef = collection(db, `companies/${companyId}/submissions`);
      const snapshot = await getDocs(submissionsRef);

      const submissionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];

      // Sort by created date (newest first)
      submissionsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setSubmissions(submissionsList);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
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
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive'
      });
    }
  };

  const filteredSubmissions = filterStatus === 'all'
    ? submissions
    : submissions.filter(s => s.status === filterStatus);

  // Calculate stats
  const stats = {
    total: submissions.length,
    sent: submissions.filter(s => ['sent', 'opened', 'clicked', 'replied'].includes(s.status)).length,
    opened: submissions.filter(s => ['opened', 'clicked', 'replied'].includes(s.status)).length,
    replied: submissions.filter(s => s.status === 'replied').length,
  };

  const selectedSubmission = submissions.find(s => s.id === selectedId);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 md:py-12">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:py-12">
      <div className="max-w-[672px] mx-auto mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link href={`/companies/${companyId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Emails</h1>
            <p className="text-muted-foreground mt-2">{companyName}</p>
          </div>
          <Button variant="outline" onClick={loadData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Summary */}
        {stats.total > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Emails</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">{stats.opened}</div>
                <div className="text-xs text-muted-foreground">Opened</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-teal-600">{stats.replied}</div>
                <div className="text-xs text-muted-foreground">Replied</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        {submissions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as SubmissionStatus | 'all')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Split View */}
      <div className="max-w-[672px] mx-auto">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">No emails sent yet</p>
                <p className="text-sm text-muted-foreground">
                  Emails sent from carrier submission tasks will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">No emails match the selected filter</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-400px)] bg-background">
          {/* Left Panel - Emails List */}
          <div className="w-1/2 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>All Emails</CardTitle>
                <CardDescription>
                  {filteredSubmissions.length} email{filteredSubmissions.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-1">
                  {(() => {
                    // Group submissions by carrier name (normalize by removing "Follow Up" suffix)
                    const groupedByCarrier = filteredSubmissions.reduce((acc, submission) => {
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(selectedSubmission)}
                        >
                          <Edit2 className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
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
                        <div className="text-sm font-medium text-muted-foreground mb-1">Task</div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm">{selectedSubmission.taskName}</div>
                          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                            <Link href={`/companies/${companyId}/tasks/${selectedSubmission.taskId}`}>
                              View Task
                            </Link>
                          </Button>
                        </div>
                      </div>
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
        )}
      </div>
    </div>
  );
}
