import React, { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { themes } from './theme';

/**
 * Publishes the active theme as CSS custom properties.
 *
 * Every surface in the app (and the xterm instances, which read the variables
 * back through getComputedStyle) derives its colours from these, so switching
 * themes never requires touching component code.
 */
export const ThemeApplier: React.FC = () => {
  const themeName = useSettingsStore((s) => s.settings.appearance.theme);

  useEffect(() => {
    const theme = themes[themeName] ?? themes.dark;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme)) {
      root.style.setProperty(key, value);
    }
    // The browser chrome (title bar area) should match the app surface.
    root.style.colorScheme = themeName === 'light' ? 'light' : 'dark';
    root.dataset.theme = themeName;
  }, [themeName]);

  return null;
};

export default ThemeApplier;
