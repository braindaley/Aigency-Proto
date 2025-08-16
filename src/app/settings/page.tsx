
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="text-muted-foreground mt-2 mb-8">Manage your application settings.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Task Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Manage global tasks for your agency.</p>
            <Button asChild>
              <Link href="/settings/task-settings">
                Go to Task Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
