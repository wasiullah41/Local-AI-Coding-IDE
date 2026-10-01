import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  FolderOpen,
  Files,
  GitBranch,
  Bot,
  Terminal,
  Puzzle,
  Settings,
  Save,
  Sun,
  Moon,
  Contrast,
  PanelLeft,
  PanelRight,
  PanelBottom,
  RotateCcw,
  CornerDownLeft,
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layoutStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useExplorerStore } from '../../stores/explorerStore';
import { useAIStore } from '../../stores/aiStore';
import { useGitStore } from '../../stores/gitStore';
import type { FileEntry } from '@local-ide/shared';

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  run: () => void;
}

/** Subsequence match with a light score, so "gstc" finds "Git: Source Control". */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  const direct = t.indexOf(q);
  if (direct !== -1) return 1000 - direct + (direct === 0 ? 100 : 0);

  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const char of q) {
    const found = t.indexOf(char, ti);
    if (found === -1) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 5 - Math.min(5, found - ti);
    ti = found + 1;
  }
  return score;
}

const flattenFiles = (entries: FileEntry[], depth = 0, out: FileEntry[] = []): FileEntry[] => {
  for (const entry of entries) {
    if (depth > 6) continue;
    out.push(entry);
    if (entry.type === 'directory' && entry.children) {
      flattenFiles(entry.children, depth + 1, out);
    }
  }
  return out;
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const layout = useLayoutStore();
  const { settings, updateSettings } = useSettingsStore();
  const { openFile, saveTab, activeTabPath } = useEditorStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const browseForFolder = useWorkspaceStore((s) => s.browseForFolder);
  const setError = useWorkspaceStore((s) => s.setError);
  const { rootFiles, loadRootFiles } = useExplorerStore();
  const newConversation = useAIStore((s) => s.newConversation);
  const refreshGit = useGitStore((s) => s.refresh);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setIndex(0);
      // Files are needed for "Go to file"; load lazily when the palette opens.
      if (workspace && rootFiles.length === 0) void loadRootFiles();
    }
  }, [isOpen, workspace, rootFiles.length, loadRootFiles]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const commands = useMemo<PaletteItem[]>(() => {
    const close = () => layout.setPaletteOpen(false);
    const act = (fn: () => void) => () => {
      fn();
      close();
    };

    return [
      {
        id: 'file.openFolder',
        label: 'File: Open Folder',
        hint: workspace ? 'switch workspace' : undefined,
        icon: FolderOpen,
        run: act(() => {
          void (async () => {
            const picked = await browseForFolder();
            if (picked[0]) await useWorkspaceStore.getState().openWorkspace(picked[0]);
            else setError('Folder picking needs the desktop app.');
          })();
        }),
      },
      { id: 'file.save', label: 'File: Save', icon: Save, run: act(() => activeTabPath && void saveTab(activeTabPath)) },
      { id: 'view.explorer', label: 'View: Show Explorer', icon: Files, run: act(() => layout.setActiveView('explorer')) },
      { id: 'view.search', label: 'View: Show Search', icon: Search, run: act(() => layout.setActiveView('search')) },
      { id: 'view.git', label: 'Git: Show Source Control', icon: GitBranch, run: act(() => layout.setActiveView('git')) },
      { id: 'view.gitRefresh', label: 'Git: Refresh Status', icon: RotateCcw, run: act(() => void refreshGit()) },
      { id: 'view.extensions', label: 'View: Show Extensions', icon: Puzzle, run: act(() => layout.setActiveView('extensions')) },
      { id: 'view.settings', label: 'Preferences: Open Settings', icon: Settings, run: act(() => layout.setActiveView('settings')) },
      { id: 'view.ai', label: 'View: Show AI Assistant', icon: Bot, run: act(() => layout.setAiPanelVisible(true)) },
      { id: 'view.toggleSidebar', label: 'View: Toggle Primary Side Bar', icon: PanelLeft, run: act(() => layout.setSidebarVisible(!layout.sidebarVisible)) },
      { id: 'view.togglePanel', label: 'View: Toggle Panel', icon: PanelBottom, run: act(() => layout.toggleBottomPanel()) },
      { id: 'view.toggleAI', label: 'View: Toggle AI Panel', icon: PanelRight, run: act(() => layout.toggleAiPanel()) },
      { id: 'view.resetLayout', label: 'View: Reset Layout', icon: RotateCcw, run: act(() => layout.resetLayout()) },
      { id: 'terminal.focus', label: 'Terminal: Focus Terminal', hint: 'Ctrl+`', icon: Terminal, run: act(() => { layout.setBottomPanelTab('terminal'); layout.setBottomPanelVisible(true); }) },
      { id: 'theme.light', label: 'Color Theme: Light Modern', icon: Sun, run: act(() => updateSettings({ appearance: { ...settings.appearance, theme: 'light' } })) },
      { id: 'theme.dark', label: 'Color Theme: Dark Modern', icon: Moon, run: act(() => updateSettings({ appearance: { ...settings.appearance, theme: 'dark' } })) },
      { id: 'theme.contrast', label: 'Color Theme: High Contrast', icon: Contrast, run: act(() => updateSettings({ appearance: { ...settings.appearance, theme: 'high-contrast' } })) },
      { id: 'ai.new', label: 'AI: New Conversation', icon: Bot, run: act(() => newConversation()) },
    ];
  }, [
    layout,
    workspace,
    browseForFolder,
    setError,
    activeTabPath,
    saveTab,
    refreshGit,
    settings.appearance,
    updateSettings,
    newConversation,
  ]);

  const fileItems = useMemo<PaletteItem[]>(() => {
    if (!workspace) return [];
    return flattenFiles(rootFiles)
      .filter((entry) => entry.type === 'file')
      .map((entry) => ({
        id: `file.${entry.path}`,
        label: entry.relativePath ?? entry.name,
        hint: 'file',
        icon: Files,
        run: () => {
          layout.setPaletteOpen(false);
          void openFile(entry.path);
        },
      }));
  }, [workspace, rootFiles, layout, openFile]);

  const results = useMemo(() => {
    const all = [...commands, ...fileItems];
    if (!query.trim()) return all.slice(0, 12);
    return all
      .map((item) => ({ item, score: fuzzyScore(query.trim(), item.label) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((entry) => entry.item);
  }, [query, commands, fileItems]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index, results.length]);

  const execute = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      item.run();
    },
    []
  );

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg overflow-hidden shadow-2xl anim-scale-in"
        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border-strong)' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div
          className="flex items-center gap-2 px-3 h-10 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                execute(results[index]);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Type a command, or search for a file"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--color-text)' }}
            aria-label="Command or file"
          />
          <kbd className="text-[10px] px-1 rounded" style={{ background: 'var(--color-elevated)', color: 'var(--color-text-subtle)' }}>
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto ide-scroll py-1" role="listbox">
          {results.length === 0 && (
            <p className="px-3 py-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
              No matching commands or files.
            </p>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === index}
                data-selected={i === index}
                onMouseEnter={() => setIndex(i)}
                onClick={() => execute(item)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px]"
                style={{
                  background: i === index ? 'var(--color-active)' : 'transparent',
                  color: i === index ? 'var(--color-text-strong)' : 'var(--color-text)',
                }}
              >
                <Icon size={13} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                <span className="truncate flex-1">{item.label}</span>
                {i === index && <CornerDownLeft size={11} style={{ color: 'var(--color-text-subtle)' }} />}
                {item.hint && (
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-subtle)' }}>
                    {item.hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
