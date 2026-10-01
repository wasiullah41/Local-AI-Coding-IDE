import React, { useEffect, useState } from 'react';
import {
  FolderOpen,
  Search,
  GitBranch,
  Bot,
  Terminal,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useWorkspaceStore, describeError } from '../../stores/workspaceStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { aiApiService } from '../../services/api/aiApiService';
import { useAIStore } from '../../stores/aiStore';
import type { LLMProviderStatus } from '@local-ide/shared';

interface WelcomeViewProps {
  onStartTask: (task: string) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStartTask }) => {
  const { workspace, canBrowse, browseForFolder, openWorkspace, recent, loading, error, setError } =
    useWorkspaceStore();
  const { setActiveView, setBottomPanelTab, setPaletteOpen, setAiPanelVisible } = useLayoutStore();
  const setProvider = useAIStore((s) => s.setProvider);
  const setProviderChecked = useAIStore((s) => s.setProviderChecked);

  const [paths, setPaths] = useState<string[]>([]);
  const [provider, setProviderState] = useState<LLMProviderStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [taskInput, setTaskInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    aiApiService
      .getStatus()
      .then((status) => {
        if (cancelled) return;
        setProviderState(status.provider);
        setProvider(status.provider);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(describeError(err, 'Could not reach the backend.'));
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
          setProviderChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setProvider, setProviderChecked, setError]);

  const handleBrowse = async () => {
    const selected = await browseForFolder();
    setPaths(selected);
    if (selected.length > 0) await openWorkspace(selected[0]);
  };

  const nameOf = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

  const actions = [
    { label: 'Open Folder', icon: FolderOpen, onClick: canBrowse ? handleBrowse : () => setError('Folder picking needs the desktop app.') },
    { label: 'Search in Files', icon: Search, shortcut: 'Ctrl+Shift+F', onClick: () => setActiveView('search') },
    { label: 'Source Control', icon: GitBranch, shortcut: 'Ctrl+Shift+G', onClick: () => setActiveView('git') },
    { label: 'AI Assistant', icon: Bot, shortcut: 'Ctrl+Shift+I', onClick: () => setAiPanelVisible(true) },
    { label: 'Terminal', icon: Terminal, shortcut: 'Ctrl+`', onClick: () => setBottomPanelTab('terminal') },
    { label: 'Command Palette', icon: Sparkles, shortcut: 'Ctrl+Shift+P', onClick: () => setPaletteOpen(true) },
  ];

  return (
    <div
      className="flex h-full items-start justify-center overflow-y-auto ide-scroll"
      style={{ background: 'var(--color-editor-background)' }}
    >
      <div className="max-w-2xl w-full px-8 py-10 anim-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[24px] font-semibold" style={{ color: 'var(--color-text-strong)' }}>
            {workspace ? workspace.name : 'ForgeAI Studio'}
          </h1>
        </div>
        {workspace && (
          <p className="text-[12px] mb-6 font-mono truncate" style={{ color: 'var(--color-text-subtle)' }}
             title={workspace.path}>
            {workspace.path}
          </p>
        )}
        {!workspace && (
          <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Open a folder to start. Your code stays on this machine.
          </p>
        )}

        {/* Model status: honest about whether anything can actually run. */}
        <div
          className="flex items-center gap-2 mb-6 px-3 py-2 rounded text-[12px]"
          style={{
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          {checking ? (
            <Loader2 size={14} className="anim-spin" />
          ) : provider?.available ? (
            <CheckCircle2 size={14} color="var(--color-success)" />
          ) : (
            <AlertCircle size={14} color="var(--color-warning)" />
          )}
          <span>
            {checking
              ? 'Checking for a local model…'
              : provider?.available
                ? `Model ready: ${provider.model}`
                : 'No model available — start Ollama, then reload. The IDE works without one.'}
          </span>
        </div>

        {error && (
          <div
            className="mb-4 px-3 py-2 rounded text-[12px]"
            style={{
              background: 'var(--color-elevated)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
          {actions.map(({ label, icon: Icon, shortcut, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-left transition-colors"
              style={{
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <Icon size={15} style={{ color: 'var(--color-accent)' }} />
              <span className="text-[13px] flex-1">{label}</span>
              {shortcut && (
                <span className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                  {shortcut}
                </span>
              )}
            </button>
          ))}
        </div>

        {workspace && (
          <div className="mb-2">
            <p className="ide-title mb-2">Ask the agent</p>
            {/* A form, not a live call: submitting on every keystroke would
                start one agent run per character typed. */}
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const task = taskInput.trim();
                if (!task) return;
                setTaskInput('');
                onStartTask(task);
              }}
            >
              <input
                className="ide-input"
                value={taskInput}
                placeholder="e.g. Explain what this project does and where it starts"
                onChange={(e) => setTaskInput(e.target.value)}
              />
              <button
                type="submit"
                className="ide-button ide-button--primary shrink-0"
                disabled={!taskInput.trim()}
              >
                Ask
              </button>
            </form>
          </div>
        )}

        {!workspace && paths.length > 0 && (
          <p className="text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            Last opened: {paths.map(nameOf).join(', ')}
          </p>
        )}

        {!workspace && recent.length > 0 && (
          <div>
            <p className="ide-title mb-2">Recent</p>
            <ul className="flex flex-col gap-1">
              {recent.map((item) => (
                <li key={item.path}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void openWorkspace(item.path)}
                    className="w-full text-left px-2 py-1.5 rounded text-[12px] flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FolderOpen size={13} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="truncate text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                      {item.path}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeView;
