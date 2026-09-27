import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

export const StatusBar: React.FC = () => {
    const { settings } = useSettingsStore();

    if (!settings.appearance.statusBarVisible) return null;

    return (
        <footer className="h-6 bg-blue-600 text-xs px-2 flex items-center justify-between">
            <span>Ready</span>
            <div className="flex gap-4">
                <span>TypeScript</span>
                <span>UTF-8</span>
                <span>LF</span>
            </div>
        </footer>
    );
};
