import React, { useEffect } from 'react';
import { useLayoutStore } from '../../stores/layoutStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useGitStore } from '../../stores/gitStore';
import { FileTree } from '../explorer/FileTree';
import { SearchPanel } from '../search/SearchPanel';
import { SourceControlPanel } from '../sourceControl/SourceControlPanel';
import { ExtensionsPanel } from '../extensions/ExtensionsPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { ResizeHandle } from './ResizeHandle';
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '../../stores/layoutStore';

const TITLES = {
  explorer: 'Explorer',
  search: 'Search',
  git: 'Source Control',
  extensions: 'Extensions',
  settings: 'Settings',
} as const;

export const Sidebar: React.FC = () => {
  const { activeView, sidebarVisible, sidebarWidth, setSidebarWidth } = useLayoutStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const refreshGit = useGitStore((s) => s.refresh);

  // Keep Git status fresh when its view is opened.
  useEffect(() => {
    if (activeView === 'git' && workspace) void refreshGit();
  }, [activeView, workspace, refreshGit]);

  if (!sidebarVisible) return null;

  const title = TITLES[activeView];

  return (
    <>
      <aside
        className="flex flex-col shrink-0 h-full"
        style={{ width: sidebarWidth, background: 'var(--color-sidebar)' }}
        aria-label={title}
      >
        {/* Clicking the title toggles between list and tree view is a VS Code
            nicety we do not need; it is used here to collapse the panel. */}
        <div
          className="flex items-center gap-1 px-3 h-8 shrink-0"
          role="button"
          tabIndex={0}
          onClick={() => setSidebarWidth(SIDEBAR_MIN_WIDTH)}
          onKeyDown={(e) => e.key === 'Enter' && setSidebarWidth(SIDEBAR_MIN_WIDTH)}
          title="Collapse to minimum width"
        >
          <h2 className="ide-title flex-1 truncate">{title}</h2>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {activeView === 'explorer' && <FileTree />}
          {activeView === 'search' && (workspace ? <SearchPanel workspaceRoot={workspace.path} /> : <Empty label="Open a folder to search it." />)}
          {activeView === 'git' && (workspace ? <SourceControlPanel /> : <Empty label="Open a folder to use source control." />)}
          {activeView === 'extensions' && <ExtensionsPanel />}
          {activeView === 'settings' && <SettingsPanel />}
        </div>
      </aside>

      <ResizeHandle
        orientation="vertical"
        ariaLabel="Resize sidebar"
        min={SIDEBAR_MIN_WIDTH}
        max={SIDEBAR_MAX_WIDTH}
        getCurrentSize={() => useLayoutStore.getState().sidebarWidth}
        currentSize={sidebarWidth}
        onResize={setSidebarWidth}
      />
    </>
  );
};

const Empty: React.FC<{ label: string }> = ({ label }) => (
  <p className="p-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
    {label}
  </p>
);

export default Sidebar;
