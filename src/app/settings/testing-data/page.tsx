'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function TestingDataPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateWorkersCompData = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/testing-data/workers-comp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate testing data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workers-comp-test-data.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating test data:', error);
      alert('Failed to generate test data. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Testing Data</h1>
        <p className="text-muted-foreground mt-2">Generate testing data for various insurance products.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Workers' Compensation Test Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Generate a complete set of Workers' Comp testing documents including company information,
              employee data, payroll classifications, loss runs, ACORD forms, and coverage recommendations.
            </p>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Generated Documents Include:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fictional company profile with website and description</li>
                <li>• Employee count & job descriptions (Excel - chat upload)</li>
                <li>• Payroll by classification (Excel - chat upload)</li>
                <li>• Loss runs 3-5 years (Excel - chat upload)</li>
                <li>• OSHA research data (Word - create company upload)</li>
                <li>• ACORD 130 Workers' Compensation Application (Word - create company upload)</li>
                <li>• ACORD 125 Commercial Insurance Application (Word - create company upload)</li>
                <li>• Operations narrative (Word - create company upload)</li>
                <li>• Coverage recommendations (Word - create company upload)</li>
              </ul>
            </div>

            <Button
              onClick={handleCreateWorkersCompData}
              disabled={isGenerating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating Test Data...' : 'Create Workers Comp Test Data'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}