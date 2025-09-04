'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Bot, FileText, Archive, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { CompanyTask } from '@/lib/types';

interface AITaskCompletionProps {
  task: CompanyTask;
  companyId: string;
  onTaskUpdate?: () => void;
}

interface AIReadiness {
  canComplete: boolean;
  readinessScore: number;
  availableResources: {
    documents: number;
    artifacts: number;
    completedTasks: number;
  };
  recommendations: string[];
}

export function AITaskCompletion({ task, companyId, onTaskUpdate }: AITaskCompletionProps) {
  const [readiness, setReadiness] = useState<AIReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  // Only show for AI tasks
  if (task.tag !== 'ai') {
    return null;
  }

  // Don't show if task is already completed
  if (task.status === 'completed') {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            AI Task Completed
          </CardTitle>
          <CardDescription className="text-green-600">
            This task has been completed automatically by the AI system.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  useEffect(() => {
    checkAIReadiness();
  }, [task.id, companyId]);

  const checkAIReadiness = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-task-completion?taskId=${task.id}&companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setReadiness(data);
      }
    } catch (error) {
      console.error('Error checking AI readiness:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeWithAI = async () => {
    setIsCompleting(true);
    setCompletionResult(null);
    
    try {
      const response = await fetch('/api/ai-task-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          companyId: companyId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCompletionResult(result);
        
        // Refresh the task if it was completed
        if (result.taskCompleted && onTaskUpdate) {
          setTimeout(() => {
            onTaskUpdate();
          }, 1000);
        }
      } else {
        const error = await response.json();
        setCompletionResult({ error: error.error || 'Failed to complete task' });
      }
    } catch (error) {
      console.error('Error completing AI task:', error);
      setCompletionResult({ error: 'Network error occurred' });
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking AI Readiness...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!readiness) {
    return null;
  }

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getReadinessText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Limited';
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Bot className="h-5 w-5" />
          AI Task Completion
        </CardTitle>
        <CardDescription className="text-blue-600">
          Let AI complete this task using available company documents and previous task outputs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Score */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Readiness Score:</span>
          <Badge className={getReadinessColor(readiness.readinessScore)}>
            {readiness.readinessScore}% - {getReadinessText(readiness.readinessScore)}
          </Badge>
        </div>

        {/* Available Resources */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-white border">
            <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-800">{readiness.availableResources.documents}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white border">
            <Archive className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-800">{readiness.availableResources.artifacts}</div>
            <div className="text-sm text-gray-600">Artifacts</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white border">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-800">{readiness.availableResources.completedTasks}</div>
            <div className="text-sm text-gray-600">Completed Tasks</div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <span className="font-medium">Recommendations:</span>
          {readiness.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              {readiness.canComplete ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              )}
              <span className={readiness.canComplete ? 'text-green-700' : 'text-yellow-700'}>
                {rec}
              </span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={completeWithAI}
            disabled={!readiness.canComplete || isCompleting}
            className="w-full"
            size="lg"
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI is working on this task...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Complete Task with AI
              </>
            )}
          </Button>
        </div>

        {/* Completion Result */}
        {completionResult && (
          <div className={`p-4 rounded-lg border ${
            completionResult.error 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : completionResult.taskCompleted
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {completionResult.error ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Error</div>
                  <div className="text-sm">{completionResult.error}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  {completionResult.taskCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                  {completionResult.taskCompleted ? 'Task Completed!' : 'AI Response Generated'}
                </div>
                <div className="text-sm space-y-1">
                  <div>• Used {completionResult.documentsUsed} documents</div>
                  <div>• Referenced {completionResult.artifactsUsed} artifacts</div>
                  <div>• Analyzed {completionResult.completedTasksReferenced} completed tasks</div>
                </div>
                {completionResult.taskCompleted && (
                  <div className="text-sm font-medium">
                    The task has been marked as completed and dependencies have been updated.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}