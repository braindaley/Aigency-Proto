/**
 * User preferences types and interfaces
 */

export interface UserPreferences {
  userId: string;
  email?: string;

  // UI Settings
  uiSettings: {
    theme: 'light' | 'dark' | 'system';
    compactView: boolean;
    showArtifacts: boolean;
    sidebarCollapsed: boolean;
    defaultTaskView: 'list' | 'kanban' | 'timeline';
    artifactViewerPosition: 'right' | 'bottom' | 'floating';
  };

  // Task Settings
  taskSettings: {
    defaultFilters: {
      phase?: string[];
      status?: string[];
      tags?: string[];
      aiOnly?: boolean;
    };
    sortOrder: 'date' | 'priority' | 'name' | 'status';
    groupBy: 'phase' | 'status' | 'none';
    showCompletedTasks: boolean;
    autoExpandSubtasks: boolean;
  };

  // Notification Settings
  notifications: {
    email: {
      enabled: boolean;
      taskComplete: boolean;
      taskAssigned: boolean;
      dailyDigest: boolean;
      weeklyReport: boolean;
    };
    inApp: {
      enabled: boolean;
      taskComplete: boolean;
      taskAssigned: boolean;
      mentions: boolean;
      submissions: boolean;
    };
    sound: boolean;
    desktop: boolean;
  };

  // Editor Settings
  editorSettings: {
    fontSize: 'small' | 'medium' | 'large';
    fontFamily: 'default' | 'mono' | 'serif';
    lineNumbers: boolean;
    wordWrap: boolean;
    autoSave: boolean;
    autoSaveInterval: number; // seconds
    spellCheck: boolean;
  };

  // Chat Settings
  chatSettings: {
    enterToSend: boolean;
    showTypingIndicator: boolean;
    messageSound: boolean;
    compactMessages: boolean;
    showTimestamps: boolean;
  };

  // Advanced Settings
  advanced: {
    debugMode: boolean;
    performanceMode: boolean;
    experimentalFeatures: boolean;
    dataRetention: 'forever' | '1year' | '6months' | '3months';
    cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;
  version: number;
}

// Default preferences for new users
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'userId' | 'email' | 'createdAt' | 'updatedAt' | 'lastSeen'> = {
  uiSettings: {
    theme: 'system',
    compactView: false,
    showArtifacts: true,
    sidebarCollapsed: false,
    defaultTaskView: 'list',
    artifactViewerPosition: 'right',
  },
  taskSettings: {
    defaultFilters: {},
    sortOrder: 'date',
    groupBy: 'phase',
    showCompletedTasks: true,
    autoExpandSubtasks: false,
  },
  notifications: {
    email: {
      enabled: true,
      taskComplete: true,
      taskAssigned: true,
      dailyDigest: false,
      weeklyReport: false,
    },
    inApp: {
      enabled: true,
      taskComplete: true,
      taskAssigned: true,
      mentions: true,
      submissions: true,
    },
    sound: true,
    desktop: false,
  },
  editorSettings: {
    fontSize: 'medium',
    fontFamily: 'default',
    lineNumbers: true,
    wordWrap: true,
    autoSave: true,
    autoSaveInterval: 30,
    spellCheck: true,
  },
  chatSettings: {
    enterToSend: true,
    showTypingIndicator: true,
    messageSound: true,
    compactMessages: false,
    showTimestamps: true,
  },
  advanced: {
    debugMode: false,
    performanceMode: false,
    experimentalFeatures: false,
    dataRetention: 'forever',
    cacheStrategy: 'moderate',
  },
  version: 1,
};