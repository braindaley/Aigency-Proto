import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <Button asChild>
        <Link href="/settings/tasks">Go to Tasks</Link>
      </Button>
    </div>
  );
}
