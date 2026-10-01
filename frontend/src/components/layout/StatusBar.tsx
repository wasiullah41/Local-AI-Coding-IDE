import React, { useMemo } from 'react';
import { GitBranch, Wifi, WifiOff, Loader2, Bot } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useEditorStore } from '../../stores/editorStore';
import { useGitStore } from '../../stores/gitStore';
import { useAIStore } from '../../stores/aiStore';

const CONNECTION: Record<string, { label: string; color: string }> = {
  connected: { label: 'Backend connected', color: 'var(--color-success)' },
  connecting: { label: 'Connecting to backend', color: 'var(--color-warning)' },
  disconnected: { label: 'Backend unreachable', color: 'var(--color-danger)' },
};

export const StatusBar: React.FC = () => {
  const visible = useSettingsStore((s) => s.settings.appearance.statusBarVisible);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const connection = useWorkspaceStore((s) => s.connection);
  const activeTab = useEditorStore((s) => s.tabs.find((t) => t.path === s.activeTabPath));
  const currentBranch = useGitStore((s) => s.status?.currentBranch);
  const changeCount = useGitStore((s) => s.status?.changes.length ?? 0);
  const agentStatus = useAIStore((s) => s.status);
  const agentPhase = useAIStore((s) => s.phase);
  const running = useAIStore((s) => s.running);
  const provider = useAIStore((s) => s.provider);

  const connectionInfo = CONNECTION[connection] ?? CONNECTION.disconnected;

  const languageLabel = useMemo(() => {
    if (!activeTab) return null;
    const ext = activeTab.name.includes('.') ? activeTab.name.split('.').pop()! : '';
    const names: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      js: 'JavaScript',
      jsx: 'JavaScript React',
      json: 'JSON',
      md: 'Markdown',
      css: 'CSS',
      html: 'HTML',
      py: 'Python',
      yml: 'YAML',
      yaml: 'YAML',
      sql: 'SQL',
    };
    return names[ext] ?? activeTab.language ?? 'Plain Text';
  }, [activeTab]);

  const lineCount = useMemo(() => (activeTab ? activeTab.content.split('\n').length : 0), [activeTab]);

  if (!visible) return null;

  return (
    <footer
      className="flex items-center h-6 shrink-0 px-2 text-[11px] select-none"
      style={{ background: 'var(--color-panel)', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
    >
      {/* Left: workspace, branch, agent */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1 truncate" title={workspace?.path}>
          {workspace ? workspace.name : 'No folder'}
        </span>

        {currentBranch && (
          <span className="flex items-center gap-1">
            <GitBranch size={11} />
            {currentBranch}
            {changeCount > 0 && <span style={{ color: 'var(--color-text-subtle)' }}>{changeCount}</span>}
          </span>
        )}

        {running && (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
            <Loader2 size={11} className="anim-spin" />
            Agent: {(agentPhase !== 'IDLE' ? agentPhase : agentStatus).toLowerCase().replace(/_/g, ' ')}
          </span>
        )}

        {!running && provider?.available && (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-text-subtle)' }}>
            <Bot size={11} />
            {provider.model}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Right: editor + connection state */}
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span>{lineCount} lines</span>
            <span>UTF-8</span>
            <span>LF</span>
            {languageLabel && <span>{languageLabel}</span>}
          </>
        )}

        <span className="flex items-center gap-1" style={{ color: connectionInfo.color }}>
          {connection === 'connecting' ? (
            <Loader2 size={11} className="anim-spin" />
          ) : connection === 'connected' ? (
            <Wifi size={11} />
          ) : (
            <WifiOff size={11} />
          )}
          <span className="hidden sm:inline">{connectionInfo.label}</span>
        </span>
      </div>
    </footer>
  );
};

export default StatusBar;
