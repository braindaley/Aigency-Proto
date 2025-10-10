'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
          Chat
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Settings
          </Link>
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-2" />
                Sign in
              </Link>
            </Button>
          )}
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
                  Chat
                </Link>
                <Link
                  href="/settings"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Settings
                </Link>
                {user ? (
                  <>
                    <div className="text-sm text-muted-foreground pt-4 border-t">
                      {user.email}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" asChild className="justify-start">
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
