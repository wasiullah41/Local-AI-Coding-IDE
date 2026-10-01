import React from 'react';
import {
  Bot,
  Files,
  GitBranch,
  Puzzle,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useLayoutStore, type SidebarView } from '../../stores/layoutStore';
import { useGitStore, selectChangeCount } from '../../stores/gitStore';
import { useAIStore } from '../../stores/aiStore';

interface Entry {
  id: SidebarView;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

const ENTRIES: Entry[] = [
  { id: 'explorer', label: 'Explorer', icon: Files, shortcut: 'Ctrl+Shift+E' },
  { id: 'search', label: 'Search', icon: Search, shortcut: 'Ctrl+Shift+F' },
  { id: 'git', label: 'Source Control', icon: GitBranch, shortcut: 'Ctrl+Shift+G' },
  { id: 'extensions', label: 'Extensions', icon: Puzzle },
];

export const ActivityBar: React.FC = () => {
  const { activeView, sidebarVisible, toggleView, setActiveView, aiPanelVisible, toggleAiPanel } =
    useLayoutStore();
  const changeCount = useGitStore(selectChangeCount);
  const agentRunning = useAIStore((s) => s.running);
  const agentPhase = useAIStore((s) => s.phase);
  const pendingPermission = useAIStore((s) => s.pendingPermission);

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col items-center justify-between shrink-0 border-r"
      style={{
        width: 48,
        background: 'var(--color-sidebar)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex flex-col items-center w-full pt-1">
        {ENTRIES.map(({ id, label, icon: Icon, shortcut }) => {
          const isActive = activeView === id && sidebarVisible;
          const badge = id === 'git' ? changeCount : 0;

          return (
            <button
              key={id}
              type="button"
              onClick={() => (activeView === id ? toggleView(id) : setActiveView(id))}
              title={shortcut ? `${label} (${shortcut})` : label}
              aria-label={label}
              aria-pressed={isActive}
              className="relative flex items-center justify-center w-full h-12 transition-colors"
              style={{
                color: isActive ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-active)' : 'transparent',
              }}
            >
              {/* Active indicator bar, as in VS Code */}
              <span
                aria-hidden
                className="absolute left-0 top-1 bottom-1 transition-opacity"
                style={{
                  width: 2,
                  background: 'var(--color-accent)',
                  opacity: isActive ? 1 : 0,
                }}
              />
              <Icon size={20} strokeWidth={1.6} />
              {badge !== 0 && (
                <span
                  className="absolute right-1.5 bottom-2 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-semibold"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}

        {/* The assistant lives in the right-hand panel, so this toggles that
            instead of a sidebar view. */}
        <button
          type="button"
          onClick={toggleAiPanel}
          title={
            agentRunning
              ? `AI Assistant — ${agentPhase} (Ctrl+Shift+I)`
              : 'AI Assistant (Ctrl+Shift+I)'
          }
          aria-label="AI Assistant"
          aria-pressed={aiPanelVisible}
          className="relative flex items-center justify-center w-full h-12 transition-colors"
          style={{
            color: aiPanelVisible ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
            background: aiPanelVisible ? 'var(--color-active)' : 'transparent',
          }}
        >
          <span
            aria-hidden
            className="absolute left-0 top-1 bottom-1 transition-opacity"
            style={{
              width: 2,
              background: 'var(--color-accent)',
              opacity: aiPanelVisible ? 1 : 0,
            }}
          />
          <Bot size={20} strokeWidth={1.6} />
          {pendingPermission ? (
            <span
              className="absolute right-1.5 bottom-2 flex items-center justify-center w-[14px] h-[14px] rounded-full text-[9px] font-bold"
              style={{ background: 'var(--color-danger)', color: '#fff' }}
            >
              !
            </span>
          ) : agentRunning ? (
            <span
              className="anim-pulse absolute right-2.5 bottom-2.5 h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
          ) : null}
        </button>
      </div>

      {(() => {
        // Settings is not in ENTRIES because it has no badge and no shortcut,
        // but it toggles like every other view.
        const isActive = activeView === 'settings' && sidebarVisible;
        return (
          <button
            type="button"
            onClick={() =>
              activeView === 'settings' ? toggleView('settings') : setActiveView('settings')
            }
            title="Settings"
            aria-label="Settings"
            aria-pressed={isActive}
            className="relative flex items-center justify-center w-full h-12 mb-1 transition-colors"
            style={{
              color: isActive ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
              background: isActive ? 'var(--color-active)' : 'transparent',
            }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-1 bottom-1 transition-opacity"
              style={{
                width: 2,
                background: 'var(--color-accent)',
                opacity: isActive ? 1 : 0,
              }}
            />
            <Settings size={20} strokeWidth={1.6} />
          </button>
        );
      })()}
    </nav>
  );
};

export default ActivityBar;
