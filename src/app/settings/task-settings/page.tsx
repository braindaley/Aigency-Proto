
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TaskSettingsPage() {
  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
       <div className="mb-8">
        <Link href="/settings" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
      </div>
      <h1 className="text-3xl font-bold">Task Settings</h1>
      <p className="text-muted-foreground mt-2 mb-8">Manage global tasks for different policy types.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Worker's Comp Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Manage tasks related to Worker's Comp policies.</p>
            <Button asChild>
              <Link href="/settings/task-settings/workers-comp">
                Go to Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
