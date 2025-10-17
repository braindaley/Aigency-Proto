'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Eye, Clock, CheckCircle2, RefreshCw, Filter } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
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

export default function CompanyEmailsPage() {
  const params = useParams();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | 'all'>('all');

  useEffect(() => {
    loadData();
  }, [companyId]);

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

  const filteredSubmissions = filterStatus === 'all'
    ? submissions
    : submissions.filter(s => s.status === filterStatus);

  // Group submissions by task
  const submissionsByTask = filteredSubmissions.reduce((acc, submission) => {
    const taskId = submission.taskId;
    if (!acc[taskId]) {
      acc[taskId] = [];
    }
    acc[taskId].push(submission);
    return acc;
  }, {} as Record<string, Submission[]>);

  // Calculate stats
  const stats = {
    total: submissions.length,
    sent: submissions.filter(s => ['sent', 'opened', 'clicked', 'replied'].includes(s.status)).length,
    opened: submissions.filter(s => ['opened', 'clicked', 'replied'].includes(s.status)).length,
    replied: submissions.filter(s => s.status === 'replied').length,
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-lg px-4 py-8 md:py-12">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 md:py-12">
      <div className="mb-8">
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

      {/* Submissions by Task */}
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
        <div className="space-y-6">
          {Object.entries(submissionsByTask).map(([taskId, taskSubmissions]) => (
            <Card key={taskId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{taskSubmissions[0].taskName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {taskSubmissions.length} carrier{taskSubmissions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/companies/${companyId}/tasks/${taskId}`}>
                      View Task
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taskSubmissions.map(submission => (
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
                            <p className="truncate font-medium text-foreground">{submission.subject}</p>
                          </div>
                          {submission.sentAt && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Sent {format(submission.sentAt.toDate(), 'MMM d, yyyy h:mm a')}
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
                          {!submission.sentAt && submission.createdAt && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Created {format(submission.createdAt.toDate(), 'MMM d, yyyy h:mm a')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
