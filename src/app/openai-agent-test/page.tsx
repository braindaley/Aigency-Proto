'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Package, Megaphone, FileBarChart, CheckCircle, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function OpenAIAgentTestPage() {
  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-8">ChatGpt Agent Flow</h1>

        {/* Worker's Comp Workflow Card */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-6">
              Worker's Comp - Renewal: Dec 6, 2025
            </h2>

            <div className="space-y-6">
              {/* First Row: Submission -> Marketing -> Proposal */}
              <div className="flex items-start gap-6">
                {/* Submission */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Submission</h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button asChild variant="outline" size="sm" className="whitespace-normal text-left justify-start">
                      <Link href="/openai-agent-test/chat">
                        Build package
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Marketing */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm text-muted-foreground">Marketing</h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                      Identify carriers
                    </Button>
                    <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                      Track submissions
                    </Button>
                  </div>
                </div>

                {/* Proposal */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileBarChart className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm text-muted-foreground">Proposal</h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                      Compare quotes
                    </Button>
                    <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                      Build proposal
                    </Button>
                  </div>
                </div>
              </div>

              {/* Second Row: Binding -> Policy Check */}
              <div className="flex items-start gap-6">
                {/* Binding */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm text-muted-foreground">Binding</h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                      Bind with carrier
                    </Button>
                    <Button variant="outline" size="sm" disabled className="whitespace-normal text-left justify-start">
                      Issue client docs
                    </Button>
                  </div>
                </div>

                {/* Policy checking */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Policy Check</h3>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" size="sm" className="whitespace-normal text-left justify-start">
                      Compare policy
                    </Button>
                  </div>
                </div>

                {/* Empty space to balance the layout */}
                <div className="flex-1 min-w-[140px]"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
