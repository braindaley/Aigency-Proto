'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CriteriaAssessment {
  criterion: string;
  status: 'MET' | 'PARTIALLY_MET' | 'NOT_MET';
  evidence: string;
  explanation: string;
}

interface ValidationResult {
  overallStatus: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
  completionPercentage: number;
  criteriaAssessment: CriteriaAssessment[];
  summary: string;
  recommendations: string[];
  nextSteps: string;
}

interface TaskValidationResultsProps {
  validation: ValidationResult;
  taskName: string;
  onClose: () => void;
}

export function TaskValidationResults({ validation, taskName, onClose }: TaskValidationResultsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'MET':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PARTIALLY_COMPLETED':
      case 'PARTIALLY_MET':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'NOT_COMPLETED':
      case 'NOT_MET':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'MET':
        return 'bg-green-100 text-green-800';
      case 'PARTIALLY_COMPLETED':
      case 'PARTIALLY_MET':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_COMPLETED':
      case 'NOT_MET':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Task Completion Validation</h2>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>

          {/* Overall Status Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(validation.overallStatus)}
                Task: {taskName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(validation.overallStatus)}>
                  {validation.overallStatus.replace('_', ' ')}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">Completion: {validation.completionPercentage}%</span>
                  </div>
                  <Progress value={validation.completionPercentage} className="h-2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{validation.summary}</p>
            </CardContent>
          </Card>

          {/* Criteria Assessment */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Success Criteria Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validation.criteriaAssessment.map((assessment, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {getStatusIcon(assessment.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(assessment.status)} variant="outline">
                            {assessment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-2">{assessment.criterion}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{assessment.explanation}</p>
                        {assessment.evidence && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium mb-1">Evidence:</p>
                            <p className="text-sm">{assessment.evidence}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {validation.recommendations && validation.recommendations.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {validation.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          {validation.nextSteps && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{validation.nextSteps}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}