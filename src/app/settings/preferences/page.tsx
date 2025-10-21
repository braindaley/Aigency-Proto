'use client';

import { useState } from 'react';
import { usePreferences } from '@/hooks/use-preferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Palette,
  Bell,
  Monitor,
  MessageSquare,
  FileText,
  Zap,
  RotateCcw,
  Save,
  Loader2
} from 'lucide-react';

export default function PreferencesPage() {
  const { preferences, loading, updatePreference, resetToDefaults } = usePreferences();
  const [saving, setSaving] = useState(false);

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handlePreferenceChange = async (path: string, value: any) => {
    setSaving(true);
    await updatePreference(path, value);
    setSaving(false);
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Preferences</h1>
        <p className="text-muted-foreground">
          Customize your experience with personalized settings that sync across all your devices.
        </p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden md:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden md:inline">Editor</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden md:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how the application looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.uiSettings.theme}
                  onValueChange={(value) => handlePreferenceChange('uiSettings.theme', value)}
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-view">Compact View</Label>
                  <p className="text-sm text-muted-foreground">Use less spacing between elements</p>
                </div>
                <Switch
                  id="compact-view"
                  checked={preferences.uiSettings.compactView}
                  onCheckedChange={(checked) => handlePreferenceChange('uiSettings.compactView', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-artifacts">Show Artifacts</Label>
                  <p className="text-sm text-muted-foreground">Display artifact viewer by default</p>
                </div>
                <Switch
                  id="show-artifacts"
                  checked={preferences.uiSettings.showArtifacts}
                  onCheckedChange={(checked) => handlePreferenceChange('uiSettings.showArtifacts', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artifact-position">Artifact Viewer Position</Label>
                <Select
                  value={preferences.uiSettings.artifactViewerPosition}
                  onValueChange={(value) => handlePreferenceChange('uiSettings.artifactViewerPosition', value)}
                >
                  <SelectTrigger id="artifact-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right Panel</SelectItem>
                    <SelectItem value="bottom">Bottom Panel</SelectItem>
                    <SelectItem value="floating">Floating Window</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Settings</CardTitle>
              <CardDescription>Configure how tasks are displayed and organized</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-view">Default Task View</Label>
                <Select
                  value={preferences.taskSettings.defaultTaskView}
                  onValueChange={(value) => handlePreferenceChange('taskSettings.defaultTaskView', value)}
                >
                  <SelectTrigger id="default-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List View</SelectItem>
                    <SelectItem value="kanban">Kanban Board</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-order">Sort Order</Label>
                <Select
                  value={preferences.taskSettings.sortOrder}
                  onValueChange={(value) => handlePreferenceChange('taskSettings.sortOrder', value)}
                >
                  <SelectTrigger id="sort-order">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-by">Group By</Label>
                <Select
                  value={preferences.taskSettings.groupBy}
                  onValueChange={(value) => handlePreferenceChange('taskSettings.groupBy', value)}
                >
                  <SelectTrigger id="group-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase">Phase</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="none">No Grouping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-completed">Show Completed Tasks</Label>
                  <p className="text-sm text-muted-foreground">Display tasks that are already complete</p>
                </div>
                <Switch
                  id="show-completed"
                  checked={preferences.taskSettings.showCompletedTasks}
                  onCheckedChange={(checked) => handlePreferenceChange('taskSettings.showCompletedTasks', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-expand">Auto-Expand Subtasks</Label>
                  <p className="text-sm text-muted-foreground">Automatically show subtasks when viewing tasks</p>
                </div>
                <Switch
                  id="auto-expand"
                  checked={preferences.taskSettings.autoExpandSubtasks}
                  onCheckedChange={(checked) => handlePreferenceChange('taskSettings.autoExpandSubtasks', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-enabled">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={preferences.notifications.email.enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.email.enabled', checked)}
                />
              </div>

              {preferences.notifications.email.enabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-task-complete">Task Completion</Label>
                      <Switch
                        id="email-task-complete"
                        checked={preferences.notifications.email.taskComplete}
                        onCheckedChange={(checked) => handlePreferenceChange('notifications.email.taskComplete', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-task-assigned">Task Assignment</Label>
                      <Switch
                        id="email-task-assigned"
                        checked={preferences.notifications.email.taskAssigned}
                        onCheckedChange={(checked) => handlePreferenceChange('notifications.email.taskAssigned', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-daily">Daily Digest</Label>
                      <Switch
                        id="email-daily"
                        checked={preferences.notifications.email.dailyDigest}
                        onCheckedChange={(checked) => handlePreferenceChange('notifications.email.dailyDigest', checked)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>Configure in-app notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="inapp-enabled">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">Show notifications within the app</p>
                </div>
                <Switch
                  id="inapp-enabled"
                  checked={preferences.notifications.inApp.enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.inApp.enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound">Sound Notifications</Label>
                  <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                </div>
                <Switch
                  id="sound"
                  checked={preferences.notifications.sound}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.sound', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editor Settings</CardTitle>
              <CardDescription>Configure text editor preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="font-size">Font Size</Label>
                <Select
                  value={preferences.editorSettings.fontSize}
                  onValueChange={(value) => handlePreferenceChange('editorSettings.fontSize', value)}
                >
                  <SelectTrigger id="font-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="line-numbers">Line Numbers</Label>
                  <p className="text-sm text-muted-foreground">Show line numbers in editor</p>
                </div>
                <Switch
                  id="line-numbers"
                  checked={preferences.editorSettings.lineNumbers}
                  onCheckedChange={(checked) => handlePreferenceChange('editorSettings.lineNumbers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="word-wrap">Word Wrap</Label>
                  <p className="text-sm text-muted-foreground">Wrap long lines in editor</p>
                </div>
                <Switch
                  id="word-wrap"
                  checked={preferences.editorSettings.wordWrap}
                  onCheckedChange={(checked) => handlePreferenceChange('editorSettings.wordWrap', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save changes</p>
                </div>
                <Switch
                  id="auto-save"
                  checked={preferences.editorSettings.autoSave}
                  onCheckedChange={(checked) => handlePreferenceChange('editorSettings.autoSave', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat Settings</CardTitle>
              <CardDescription>Configure chat behavior and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enter-send">Enter to Send</Label>
                  <p className="text-sm text-muted-foreground">Press Enter to send messages (Shift+Enter for new line)</p>
                </div>
                <Switch
                  id="enter-send"
                  checked={preferences.chatSettings.enterToSend}
                  onCheckedChange={(checked) => handlePreferenceChange('chatSettings.enterToSend', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="typing-indicator">Typing Indicator</Label>
                  <p className="text-sm text-muted-foreground">Show when others are typing</p>
                </div>
                <Switch
                  id="typing-indicator"
                  checked={preferences.chatSettings.showTypingIndicator}
                  onCheckedChange={(checked) => handlePreferenceChange('chatSettings.showTypingIndicator', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="message-sound">Message Sound</Label>
                  <p className="text-sm text-muted-foreground">Play sound for new messages</p>
                </div>
                <Switch
                  id="message-sound"
                  checked={preferences.chatSettings.messageSound}
                  onCheckedChange={(checked) => handlePreferenceChange('chatSettings.messageSound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-timestamps">Show Timestamps</Label>
                  <p className="text-sm text-muted-foreground">Display message timestamps</p>
                </div>
                <Switch
                  id="show-timestamps"
                  checked={preferences.chatSettings.showTimestamps}
                  onCheckedChange={(checked) => handlePreferenceChange('chatSettings.showTimestamps', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced features and performance options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="debug-mode">Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">Show debug information and console logs</p>
                </div>
                <Switch
                  id="debug-mode"
                  checked={preferences.advanced.debugMode}
                  onCheckedChange={(checked) => handlePreferenceChange('advanced.debugMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="performance-mode">Performance Mode</Label>
                  <p className="text-sm text-muted-foreground">Optimize for performance over visual effects</p>
                </div>
                <Switch
                  id="performance-mode"
                  checked={preferences.advanced.performanceMode}
                  onCheckedChange={(checked) => handlePreferenceChange('advanced.performanceMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="experimental">Experimental Features</Label>
                  <p className="text-sm text-muted-foreground">Enable beta and experimental features</p>
                  <Badge variant="outline" className="mt-1">Beta</Badge>
                </div>
                <Switch
                  id="experimental"
                  checked={preferences.advanced.experimentalFeatures}
                  onCheckedChange={(checked) => handlePreferenceChange('advanced.experimentalFeatures', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention</Label>
                <Select
                  value={preferences.advanced.dataRetention}
                  onValueChange={(value) => handlePreferenceChange('advanced.dataRetention', value)}
                >
                  <SelectTrigger id="data-retention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cache-strategy">Cache Strategy</Label>
                <Select
                  value={preferences.advanced.cacheStrategy}
                  onValueChange={(value) => handlePreferenceChange('advanced.cacheStrategy', value)}
                >
                  <SelectTrigger id="cache-strategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (Less Storage)</SelectItem>
                    <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                    <SelectItem value="aggressive">Aggressive (Faster Performance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>

        <div className="flex items-center gap-2">
          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            <Save className="h-3 w-3" />
            Auto-Save Enabled
          </Badge>
        </div>
      </div>
    </div>
  );
}