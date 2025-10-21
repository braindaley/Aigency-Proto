'use client';

import { PreferencesProvider } from '@/hooks/use-preferences';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <PreferencesProvider userId={user?.uid} email={user?.email || undefined}>
      {children}
    </PreferencesProvider>
  );
}
