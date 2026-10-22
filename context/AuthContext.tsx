import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  bio?: string;
};

type AuthContextType = {
  user: UserProfile | null;
  session: any | null;
  initialized: boolean;
  signOut: () => Promise<void>;
  updateUser: (profile: Partial<UserProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  initialized: true,
  signOut: async () => {},
  updateUser: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('@zen_user_profile');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load local profile in AuthContext', e);
      } finally {
        setInitialized(true);
      }
    };
    loadProfile();
  }, []);

  const updateUser = async (profile: Partial<UserProfile>) => {
    try {
      const updated = { ...(user || { id: 'local_user', name: 'Zen User' }), ...profile };
      setUser(updated);
      await AsyncStorage.setItem('@zen_user_profile', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update local user profile', e);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@zen_user_profile');
      setUser(null);
    } catch (e) {
      console.error('Failed to clear profile', e);
    }
  };

  const value = {
    user,
    session: user ? { user } : null,
    initialized,
    signOut,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
