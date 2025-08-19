import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TestingDataPage() {
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
        <p className="text-muted-foreground mt-2">Manage testing data for your application.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Testing Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configure and manage testing data settings here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}