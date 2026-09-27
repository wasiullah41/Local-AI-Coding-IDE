import React from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';

export const TabBar: React.FC = () => {
  const { tabs, activeTabPath, setActiveTab, closeTab } = useEditorStore();

  return (
    <div className="flex bg-[var(--color-sidebar)] border-b border-[var(--color-border)] h-9">
      {tabs.map(tab => (
        <div
          key={tab.path}
          className={'flex items-center px-3 text-xs border-r border-[var(--color-border)] cursor-pointer ' + (activeTabPath === tab.path ? 'bg-[var(--color-background)]' : 'bg-[var(--color-sidebar)] text-gray-400')}
          onClick={() => setActiveTab(tab.path)}
        >
          {tab.name}
          {tab.isDirty && <span className="ml-2 w-2 h-2 rounded-full bg-yellow-400" />}
          <X
            size={14}
            className="ml-2 hover:text-[var(--color-text)]"
            onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
          />
        </div>
      ))}
    </div>
  );
};
