'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold">
          Aigency-Proto
        </Link>
      </div>

      <nav className="hidden md:flex flex-1 justify-center items-center gap-4">
        <Link href="/companies" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Companies
        </Link>
        <Link href="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          AI Assistant
        </Link>
      </nav>
      
      <div className="flex items-center gap-4">
        <nav className="hidden md:flex">
             <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Settings
            </Link>
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                 <Link
                  href="/companies"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Companies
                </Link>
                <Link
                  href="/chat"
                  className="text-muted-foreground hover:text-foreground"
                >
                  AI Assistant
                </Link>
                <Link
                  href="/settings"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Settings
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
