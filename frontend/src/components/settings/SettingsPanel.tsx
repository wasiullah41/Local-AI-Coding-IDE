import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

  return (
    <div className="p-4 bg-gray-900 h-full overflow-y-auto text-white">
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">Editor</h3>
          <div className="flex flex-col gap-2">
            <label className="text-xs">Font Size
              <input type="number" value={settings.editor.fontSize}
                onChange={e => updateSettings({ editor: {...settings.editor, fontSize: parseInt(e.target.value)} })}
                className="ml-2 bg-gray-800 p-1 rounded" />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={settings.editor.minimap}
                onChange={e => updateSettings({ editor: {...settings.editor, minimap: e.target.checked} })} />
              Minimap
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
