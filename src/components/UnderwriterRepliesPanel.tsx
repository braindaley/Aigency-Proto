'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mail, Clock, CheckCircle2, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Submission, SubmissionReply } from '@/lib/types';
import { format } from 'date-fns';

interface SubmissionWithReplies extends Submission {
  replies: SubmissionReply[];
  hasUnrespondedReply?: boolean;
}

interface UnderwriterRepliesPanelProps {
  companyId: string;
  taskId: string;
}

export function UnderwriterRepliesPanel({ companyId, taskId }: UnderwriterRepliesPanelProps) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<SubmissionWithReplies[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithReplies | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatingReply, setSimulatingReply] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [companyId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      // Get all submissions from Tasks 12 and 14
      const submissionsRef = collection(db, `companies/${companyId}/submissions`);
      const q = query(submissionsRef);

      const snapshot = await getDocs(q);
      const loadedSubmissions: SubmissionWithReplies[] = snapshot.docs
        .filter(doc => doc.data().status !== 'draft') // Filter out drafts in memory
        .map(doc => {
        const data = doc.data();
        const replies = (data.replies || []) as SubmissionReply[];

        // Check if any reply doesn't have a response yet
        const hasUnrespondedReply = replies.some((reply: SubmissionReply) =>
          !reply.responded && !reply.responseBody
        );

        return {
          id: doc.id,
          ...data,
          replies,
          hasUnrespondedReply
        } as SubmissionWithReplies;
      });

      // Filter to only show submissions with replies and sort them
      const submissionsWithReplies = loadedSubmissions
        .filter(s => s.replies && s.replies.length > 0)
        .sort((a, b) => {
          // Sort by: unresponded first, then by sent date (newest first)
          if (a.hasUnrespondedReply && !b.hasUnrespondedReply) return -1;
          if (!a.hasUnrespondedReply && b.hasUnrespondedReply) return 1;
          const aDate = a.sentAt?.seconds || 0;
          const bDate = b.sentAt?.seconds || 0;
          return bDate - aDate;
        });

      setSubmissions(submissionsWithReplies);

      // Auto-select first submission with unresponded reply
      const firstUnresponded = submissionsWithReplies.find(s => s.hasUnrespondedReply);
      if (firstUnresponded) {
        setSelectedSubmission(firstUnresponded);
      } else if (submissionsWithReplies.length > 0) {
        setSelectedSubmission(submissionsWithReplies[0]);
      }

    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions with replies',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateUnderwriterReply = async (submissionId: string) => {
    try {
      setSimulatingReply(submissionId);

      // Sample underwriter questions
      const sampleQuestions = [
        "Can you provide more details on the safety training program for drivers?",
        "What specific loss control measures are in place for workers operating heavy machinery?",
        "Please clarify the total payroll breakdown by classification code.",
        "Do you have documentation of the current workers' compensation coverage history?",
        "What is your experience mod and how has it trended over the past 3 years?",
        "Can you provide details on any OSHA violations in the last 5 years?",
        "What percentage of your workforce is part-time vs full-time?",
        "Are there any subcontractors included in this submission? If so, please provide COI.",
      ];

      const randomQuestion = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];

      const submission = submissions.find(s => s.id === submissionId);
      const carrierName = submission?.carrierName || 'Carrier';

      const response = await fetch('/api/submissions/add-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          companyId,
          reply: {
            from: `underwriter@${carrierName.toLowerCase().replace(/\s+/g, '')}.com`,
            fromName: `${carrierName} Underwriter`,
            subject: `RE: Workers' Compensation Submission`,
            body: randomQuestion,
            bodyHtml: `<p>${randomQuestion}</p>`,
            receivedAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      toast({
        title: 'Reply Simulated',
        description: 'Underwriter question added to submission'
      });

      await loadSubmissions();
    } catch (error) {
      console.error('Error simulating reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to simulate underwriter reply',
        variant: 'destructive'
      });
    } finally {
      setSimulatingReply(null);
    }
  };

  const unansweredCount = submissions.filter(s => s.hasUnrespondedReply).length;
  const totalReplies = submissions.reduce((sum, s) => sum + (s.replies?.length || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Underwriter Replies</CardTitle>
          <CardDescription>
            Monitor and respond to questions from underwriters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unansweredCount}</div>
              <div className="text-sm text-muted-foreground">Needs Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalReplies}</div>
              <div className="text-sm text-muted-foreground">Total Replies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {submissions.filter(s => !s.hasUnrespondedReply && s.replies.length > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Responded</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions with Replies</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No underwriter replies yet</p>
              <p className="text-sm">Simulate a reply to test the workflow</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSubmission?.id === submission.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{submission.carrierName}</div>
                        <div className="text-sm text-muted-foreground">{submission.contactEmail}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.hasUnrespondedReply ? (
                          <Badge variant="destructive">
                            <Clock className="h-3 w-3 mr-1" />
                            Needs Response
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Responded
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {submission.replies.length} {submission.replies.length === 1 ? 'reply' : 'replies'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          simulateUnderwriterReply(submission.id);
                        }}
                        disabled={simulatingReply === submission.id}
                      >
                        {simulatingReply === submission.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Simulating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Simulate Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Selected Submission Details */}
      {selectedSubmission && (
        <Card>
          <CardHeader>
            <CardTitle>Replies from {selectedSubmission.carrierName}</CardTitle>
            <CardDescription>
              {selectedSubmission.hasUnrespondedReply
                ? 'Use the chat to draft a response with AI assistance'
                : 'All replies have been responded to'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {selectedSubmission.replies.map((reply, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{reply.fromName || reply.from}</div>
                        <div className="text-sm text-muted-foreground">
                          {reply.receivedAt && format(new Date(reply.receivedAt.seconds * 1000), 'PPp')}
                        </div>
                      </div>
                      {reply.responded ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Responded
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <Clock className="h-3 w-3 mr-1" />
                          Needs Response
                        </Badge>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">{reply.subject}</div>
                      <div className="text-sm whitespace-pre-wrap">{reply.body}</div>
                    </div>

                    {reply.responseBody && (
                      <>
                        <Separator className="my-3" />
                        <div>
                          <div className="text-sm font-medium mb-1 text-green-700">Your Response:</div>
                          <div className="text-sm whitespace-pre-wrap bg-green-50 p-3 rounded">
                            {reply.responseBody}
                          </div>
                          {reply.respondedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Sent {format(new Date(reply.respondedAt.seconds * 1000), 'PPp')}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {!reply.responded && !reply.responseBody && (
                      <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-900">
                        <Mail className="h-4 w-4 inline mr-2" />
                        Use the chat on the left to draft a response to this question
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
