'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/lib/types/preferences';
import { useToast } from '@/hooks/use-toast';

interface PreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  updatePreference: (path: string, value: any) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

/**
 * Provider component for user preferences
 */
export function PreferencesProvider({
  children,
  userId,
  email,
}: {
  children: React.ReactNode;
  userId?: string;
  email?: string;
}) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/user/preferences?userId=${userId}&email=${email || ''}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else {
        console.error('Failed to fetch preferences');
        // Use defaults on error
        setPreferences({
          ...DEFAULT_USER_PREFERENCES,
          userId,
          email: email || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSeen: new Date(),
        } as UserPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Use defaults on error
      setPreferences({
        ...DEFAULT_USER_PREFERENCES,
        userId,
        email: email || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: new Date(),
      } as UserPreferences);
    } finally {
      setLoading(false);
    }
  }, [userId, email]);

  // Update a single preference by path (e.g., "uiSettings.theme")
  const updatePreference = useCallback(async (path: string, value: any) => {
    if (!userId || !preferences) return;

    try {
      // Optimistic update
      const pathParts = path.split('.');
      const updatedPrefs = { ...preferences };
      let current: any = updatedPrefs;

      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      current[pathParts[pathParts.length - 1]] = value;

      setPreferences(updatedPrefs);

      // Send to API
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          path,
          value,
        }),
      });

      if (!response.ok) {
        // Revert on error
        await fetchPreferences();
        throw new Error('Failed to update preference');
      }

    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: 'Failed to save preference',
        description: 'Your preference could not be saved. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userId, preferences, fetchPreferences, toast]);

  // Update multiple preferences at once
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId || !preferences) return;

    try {
      // Optimistic update
      const updatedPrefs = { ...preferences, ...updates };
      setPreferences(updatedPrefs);

      // Send to API
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          preferences: updates,
        }),
      });

      if (!response.ok) {
        // Revert on error
        await fetchPreferences();
        throw new Error('Failed to update preferences');
      }

      toast({
        title: 'Preferences saved',
        description: 'Your preferences have been updated successfully.',
      });

    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Failed to save preferences',
        description: 'Your preferences could not be saved. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userId, preferences, fetchPreferences, toast]);

  // Reset to default preferences
  const resetToDefaults = useCallback(async () => {
    if (!userId) return;

    try {
      const defaultPrefs = {
        ...DEFAULT_USER_PREFERENCES,
        userId,
        email: preferences?.email,
      };

      await updatePreferences(defaultPrefs as Partial<UserPreferences>);

      toast({
        title: 'Preferences reset',
        description: 'Your preferences have been reset to defaults.',
      });

    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast({
        title: 'Failed to reset preferences',
        description: 'Could not reset preferences. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userId, preferences?.email, updatePreferences, toast]);

  // Refresh preferences from server
  const refreshPreferences = useCallback(async () => {
    setLoading(true);
    await fetchPreferences();
  }, [fetchPreferences]);

  // Initial load
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Auto-save to Firestore when preferences change (debounced)
  useEffect(() => {
    if (!preferences || loading) return;

    const saveTimer = setTimeout(() => {
      // Preferences are already saved via updatePreference/updatePreferences
      // This is just for any direct state changes if needed
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [preferences, loading]);

  const contextValue = {
    preferences,
    loading,
    updatePreference,
    updatePreferences,
    resetToDefaults,
    refreshPreferences,
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

/**
 * Hook to use preferences context
 */
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

/**
 * Hook to get a specific preference value
 */
export function usePreference<T = any>(path: string, defaultValue?: T): [T | undefined, (value: T) => Promise<void>] {
  const { preferences, updatePreference } = usePreferences();

  const getValue = useCallback(() => {
    if (!preferences) return defaultValue;

    const pathParts = path.split('.');
    let current: any = preferences;

    for (const part of pathParts) {
      if (current?.[part] === undefined) {
        return defaultValue;
      }
      current = current[part];
    }

    return current as T;
  }, [preferences, path, defaultValue]);

  const setValue = useCallback(async (value: T) => {
    await updatePreference(path, value);
  }, [path, updatePreference]);

  return [getValue(), setValue];
}