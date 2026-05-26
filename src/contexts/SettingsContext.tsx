'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getSettings, saveSettings } from '@/lib/firestore';
import { UserSettings } from '@/types';

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  updateUnit: (unit: 'kg' | 'lbs') => Promise<void>;
  updateTheme: (theme: 'system' | 'light' | 'dark') => Promise<void>;
  loadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({ unit: 'lbs', theme: 'system' });
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  // Load settings on user login change
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setSettings({ unit: 'lbs', theme: 'system' });
        setLoadingSettings(false);
        return;
      }

      setLoadingSettings(true);
      try {
        const data = await getSettings(user.uid);
        setSettings(data);
      } catch (err) {
        console.error('Failed to load user settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated); // Optimistic UI

    if (user) {
      try {
        await saveSettings(user.uid, updated);
      } catch (err) {
        console.error('Failed to save settings to Firestore:', err);
      }
    }
  };

  const updateUnit = (unit: 'kg' | 'lbs') => updateSettings({ unit });
  const updateTheme = (theme: 'system' | 'light' | 'dark') => updateSettings({ theme });

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updateUnit, updateTheme, loadingSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be nested within a SettingsProvider');
  }
  return context;
};
