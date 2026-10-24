export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  bio?: string;
}

export interface UserSettings {
  notifications: {
    taskReminders: boolean;
  };
  hapticsEnabled: boolean;
  musicPreference: number;
}
