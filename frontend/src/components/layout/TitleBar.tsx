import React, { useEffect, useState } from 'react';
import { PanelLeft, PanelRight, PanelBottom, Terminal, Sparkles } from 'lucide-react';
import { useLayoutStore } from '../../stores/layoutStore';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAIStore } from '../../stores/aiStore';

const menuItems = [
  { label: 'File', actions: ['New File', 'Open Folder', 'Save', 'Close Window'] },
  { label: 'Edit', actions: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Find'] },
  { label: 'Selection', actions: ['Select All'] },
  { label: 'View', actions: ['Command Palette', 'Toggle Sidebar', 'Toggle Panel', 'Toggle AI'] },
  { label: 'Go', actions: ['Back', 'Forward'] },
  { label: 'Run', actions: ['Start Task', 'Stop Task', 'Run Tests'] },
  { label: 'Help', actions: ['Documentation', 'About'] },
];

export const TitleBar: React.FC = () => {
  const { workspace } = useWorkspaceStore();
  const { sidebarVisible, setSidebarVisible, aiPanelVisible, setAiPanelVisible, bottomPanelVisible, setBottomPanelVisible, setPaletteOpen, setBottomPanelTab } = useLayoutStore();
  const { activeTabPath, saveTab, tabs } = useEditorStore();
  const running = useAIStore((s) => s.running);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const activeTab = tabs.find((t) => t.path === activeTabPath);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenu]);

  const dirtyCount = tabs.filter((t) => t.isDirty).length;

  return (
    <header
      className="flex items-center h-9 shrink-0 border-b select-none"
      style={{ background: 'var(--color-titlebar)', borderColor: 'var(--color-border)' }}
    >
      {/* Menus */}
      <nav className="flex items-center h-full pl-1" aria-label="Application menu">
        {menuItems.map((menu) => (
          <div key={menu.label} className="relative h-full flex items-center">
            <button
              type="button"
              className="px-2 h-7 rounded text-[12px]"
              style={{
                background: openMenu === menu.label ? 'var(--color-hover)' : 'transparent',
                color: 'var(--color-text)',
              }}
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenu((current) => (current === menu.label ? null : menu.label));
              }}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div
                className="absolute top-8 left-0 z-50 min-w-[190px] py-1 rounded shadow-xl anim-fade-in"
                style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border-strong)' }}
                onClick={(event) => event.stopPropagation()}
              >
                {menu.actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="w-full text-left px-3 py-1 text-[12px] hover:bg-[var(--color-hover)]"
                    style={{ color: 'var(--color-text)' }}
                    onClick={() => {
                      setOpenMenu(null);
                      handleAction(action);
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1 min-w-0 px-3 text-center text-[12px] truncate" style={{ color: 'var(--color-text-muted)' }}>
        {workspace ? `${activeTab?.name ? activeTab.name + ' — ' : ''}${workspace.name}` : 'No folder open'}
        {dirtyCount > 0 && <span style={{ color: 'var(--color-text-subtle)' }}> •{dirtyCount}</span>}
      </div>

      {/* Layout toggles */}
      <div className="flex items-center gap-0.5 pr-2">
        <button
          type="button"
          className="ide-icon-button"
          aria-pressed={sidebarVisible}
          title="Toggle Primary Side Bar"
          onClick={() => setSidebarVisible(!sidebarVisible)}
        >
          <PanelLeft size={15} />
        </button>
        <button
          type="button"
          className="ide-icon-button"
          aria-pressed={bottomPanelVisible}
          title="Toggle Panel"
          onClick={() => {
            setBottomPanelVisible(!bottomPanelVisible);
            setBottomPanelTab('terminal');
          }}
        >
          <PanelBottom size={15} />
        </button>
        <button
          type="button"
          className="ide-icon-button"
          aria-pressed={aiPanelVisible}
          title="Toggle AI Panel"
          onClick={() => setAiPanelVisible(!aiPanelVisible)}
        >
          <PanelRight size={15} />
        </button>
        <button
          type="button"
          className="ide-icon-button"
          title="Command Palette (Ctrl+Shift+P)"
          onClick={() => setPaletteOpen(true)}
        >
          <Sparkles size={14} />
        </button>
        <button
          type="button"
          className="ide-button ide-button--secondary"
          style={{ height: 22, marginLeft: 4 }}
          disabled={!activeTab || !activeTab.isDirty}
          onClick={() => activeTabPath && void saveTab(activeTabPath)}
        >
          {running ? <Terminal size={12} /> : null}
          Save
        </button>
      </div>
    </header>
  );
};

/** Menu items map to real actions rather than being decorative. */
function handleAction(action: string): void {
  const layout = useLayoutStore.getState();
  const editor = useEditorStore.getState();
  const workspace = useWorkspaceStore.getState();

  switch (action) {
    case 'Command Palette':
      layout.setPaletteOpen(true);
      break;
    case 'Toggle Sidebar':
      layout.setSidebarVisible(!layout.sidebarVisible);
      break;
    case 'Toggle Panel':
      layout.toggleBottomPanel();
      break;
    case 'Toggle AI':
      layout.toggleAiPanel();
      break;
    case 'Close Window':
      window.electronAPI?.closeWindow?.();
      break;
    case 'Open Folder':
      void (async () => {
        const picked = await workspace.browseForFolder();
        if (picked[0]) await workspace.openWorkspace(picked[0]);
      })();
      break;
    case 'Save':
      if (editor.activeTabPath) void editor.saveTab(editor.activeTabPath);
      break;
    case 'New File':
      if (workspace.workspace) {
        void editor.openFile(`${workspace.workspace.path}/untitled.txt`);
      }
      break;
    default:
      break;
  }
}

export default TitleBar;
