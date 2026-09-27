import React, { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { themes } from './theme';

export const ThemeApplier: React.FC = () => {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const theme = themes[settings.appearance.theme];
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
  }, [settings.appearance.theme]);

  return null;
};
