'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, RefreshCw, Plus, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Submission, SubmissionReply } from '@/lib/types';
import { format } from 'date-fns';

interface QuestionWithSubmission {
  submission: Submission;
  reply: SubmissionReply;
  answered: boolean;
}

interface UnderwriterQuestionsPanelProps {
  companyId: string;
  taskId: string;
}

export function UnderwriterQuestionsPanel({ companyId, taskId }: UnderwriterQuestionsPanelProps) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<QuestionWithSubmission[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingReply, setAddingReply] = useState(false);
  const [newReplyBody, setNewReplyBody] = useState('');
  const [selectedSubmissionForReply, setSelectedSubmissionForReply] = useState<string>('');

  useEffect(() => {
    loadSubmissions();
  }, [companyId]);

  const loadSubmissions = async () => {
    try {
      const { collection, query, where, getDocs, or } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      // Get submissions from Tasks 12 and 14 (send packets and follow-ups)
      const submissionsRef = collection(db, `companies/${companyId}/submissions`);

      // Query for submissions that have replies
      const q = query(
        submissionsRef,
        where('status', '==', 'replied')
      );

      const snapshot = await getDocs(q);

      const submissionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];

      // Sort by last reply date
      submissionsList.sort((a, b) => {
        const aTime = a.lastReplyAt?.toMillis?.() || 0;
        const bTime = b.lastReplyAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setSubmissions(submissionsList);

      // Extract questions from replies
      const allQuestions: QuestionWithSubmission[] = [];
      submissionsList.forEach(submission => {
        if (submission.replies && submission.replies.length > 0) {
          submission.replies.forEach(reply => {
            allQuestions.push({
              submission,
              reply,
              answered: false // TODO: Track answered status
            });
          });
        }
      });

      setQuestions(allQuestions);

      // Auto-select first question
      if (allQuestions.length > 0 && !selectedQuestion) {
        setSelectedQuestion(allQuestions[0]);
      }

    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load underwriter questions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateReply = async (submissionId: string) => {
    try {
      const mockQuestions = [
        'Can you provide more details on the safety training program? Specifically, how often are the training sessions conducted?',
        'What is the total payroll for the drivers classification? The ACORD 130 shows mixed data.',
        'I noticed the experience mod is 1.51. Can you explain the factors contributing to this and any recent improvements?',
        'Are there any outstanding OSHA citations or safety violations in the past 3 years?',
        'What percentage of work is performed at heights over 15 feet? This impacts our underwriting decision.',
        'Can you clarify the subcontractor usage? Do all subs carry their own WC coverage?'
      ];

      const randomQuestion = mockQuestions[Math.floor(Math.random() * mockQuestions.length)];

      const response = await fetch('/api/submissions/add-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          companyId,
          reply: {
            from: 'underwriter@carrier.com',
            fromName: 'Underwriter Team',
            subject: 'RE: Workers\' Compensation Submission - Additional Information Needed',
            body: randomQuestion
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to simulate reply');
      }

      toast({
        title: 'Reply Added',
        description: 'Simulated underwriter question added'
      });

      await loadSubmissions();
    } catch (error) {
      console.error('Error simulating reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to simulate reply',
        variant: 'destructive'
      });
    }
  };

  const addCustomReply = async () => {
    if (!selectedSubmissionForReply || !newReplyBody.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question',
        variant: 'destructive'
      });
      return;
    }

    setAddingReply(true);
    try {
      const response = await fetch('/api/submissions/add-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmissionForReply,
          companyId,
          reply: {
            from: 'underwriter@carrier.com',
            fromName: 'Underwriter Team',
            subject: 'RE: Workers\' Compensation Submission - Question',
            body: newReplyBody
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      toast({
        title: 'Question Added',
        description: 'Underwriter question added successfully'
      });

      setNewReplyBody('');
      setSelectedSubmissionForReply('');
      await loadSubmissions();
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add question',
        variant: 'destructive'
      });
    } finally {
      setAddingReply(false);
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

  const unansweredCount = questions.filter(q => !q.answered).length;

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Underwriter Questions</CardTitle>
              <CardDescription>
                Questions from carriers that need responses
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadSubmissions} size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{unansweredCount}</div>
              <div className="text-sm text-muted-foreground">Unanswered</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{submissions.length}</div>
              <div className="text-sm text-muted-foreground">Submissions with Replies</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Reply Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test: Add Underwriter Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedSubmissionForReply}
              onChange={(e) => setSelectedSubmissionForReply(e.target.value)}
            >
              <option value="">Select a submission...</option>
              {submissions.filter(s => s.status === 'sent' || s.status === 'replied').map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.carrierName}
                </option>
              ))}
            </select>
            <Button
              onClick={() => selectedSubmissionForReply && simulateReply(selectedSubmissionForReply)}
              disabled={!selectedSubmissionForReply}
              variant="outline"
            >
              Random Question
            </Button>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Or type a custom underwriter question..."
              value={newReplyBody}
              onChange={(e) => setNewReplyBody(e.target.value)}
              rows={3}
            />
            <Button
              onClick={addCustomReply}
              disabled={!selectedSubmissionForReply || !newReplyBody.trim() || addingReply}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Question
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No underwriter questions yet</p>
            <p className="text-sm mt-2">
              Use the controls above to simulate carrier responses
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {questions.map((q, idx) => (
            <Card
              key={idx}
              className={`cursor-pointer transition-colors ${
                selectedQuestion === q ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedQuestion(q)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{q.submission.carrierName}</span>
                      <Badge variant={q.answered ? 'default' : 'secondary'}>
                        {q.answered ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Answered
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Needs Answer
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {q.reply.fromName} • {format(q.reply.receivedAt.toDate(), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
                <p className="text-sm line-clamp-2">{q.reply.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Question Detail */}
      {selectedQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question Details</CardTitle>
            <CardDescription>
              From {selectedQuestion.reply.fromName} at {selectedQuestion.submission.carrierName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Question:</div>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {selectedQuestion.reply.body}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Use the chat below to draft a response with AI assistance
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
