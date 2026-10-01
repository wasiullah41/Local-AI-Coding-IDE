import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Folder,
  FolderOpen,
  RefreshCw,
  Trash2,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { FileEntry } from '@local-ide/shared';
import { useExplorerStore } from '../../stores/explorerStore';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { fsService } from '../../services/filesystem/fsService';

/** Directories shown before everything else, as in a real explorer. */
const PINNED = ['src', 'app', 'lib', 'components', 'backend', 'frontend', 'public'];

const LANGUAGE_ICON: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f1e05a',
  jsx: '#f1e05a',
  json: '#a8a8a8',
  md: '#7cb8ff',
  css: '#42a5f5',
  html: '#e34c26',
  py: '#4b8bbe',
  yml: '#cc3e44',
  yaml: '#cc3e44',
  sql: '#e38c00',
};

const sortEntries = (entries: FileEntry[]): FileEntry[] =>
  [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    const aPinned = PINNED.indexOf(a.name);
    const bPinned = PINNED.indexOf(b.name);
    if (aPinned !== -1 || bPinned !== -1) {
      if (aPinned === -1) return 1;
      if (bPinned === -1) return -1;
      return aPinned - bPinned;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  workspaceRoot: string;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ entry, depth, workspaceRoot }) => {
  const { expandedFolders, toggleFolder } = useExplorerStore();
  const { openFile, tabs, activeTabPath } = useEditorStore();
  const [hovered, setHovered] = useState(false);
  const isExpanded = expandedFolders.has(entry.path);
  const isDirectory = entry.type === 'directory';
  const isActive = !isDirectory && activeTabPath === entry.path;
  const isOpenTab = !isDirectory && tabs.some((tab) => tab.path === entry.path);

  const extension = entry.name.includes('.') ? entry.name.split('.').pop()! : '';

  const relativeName = useMemo(() => {
    if (entry.path.startsWith(workspaceRoot)) {
      return entry.path.slice(workspaceRoot.length).replace(/^[\\/]/, '');
    }
    return entry.name;
  }, [entry.path, workspaceRoot, entry.name]);

  const handleDelete = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      const label = isDirectory ? 'folder and everything in it' : 'file';
      if (!window.confirm(`Delete this ${label}?\n\n${relativeName}\n\nThis cannot be undone.`)) return;
      try {
        await fsService.delete(entry.path);
        await useExplorerStore.getState().loadRootFiles();
      } catch (error) {
        useWorkspaceStore
          .getState()
          .setError(error instanceof Error ? error.message : 'Delete failed.');
      }
    },
    [entry.path, isDirectory, relativeName]
  );

  return (
    <div>
      <div
        role="treeitem"
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-selected={isActive}
        tabIndex={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => (isDirectory ? toggleFolder(entry.path) : void openFile(entry.path))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (isDirectory) toggleFolder(entry.path);
            else void openFile(entry.path);
          }
        }}
        className="flex items-center h-[22px] cursor-pointer transition-colors"
        style={{
          paddingLeft: depth * 12 + 4,
          paddingRight: 4,
          background: isActive
            ? 'var(--color-active)'
            : hovered
              ? 'var(--color-hover)'
              : 'transparent',
          color: isActive ? 'var(--color-text-strong)' : 'var(--color-text)',
        }}
      >
        {isDirectory ? (
          <span className="flex items-center justify-center w-4 shrink-0">
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="flex items-center justify-center w-4 mr-1 shrink-0">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen size={14} color="var(--color-accent)" />
            ) : (
              <Folder size={14} color="var(--color-accent)" />
            )
          ) : (
            <FileIcon size={14} color={LANGUAGE_ICON[extension] ?? 'var(--color-text-subtle)'} />
          )}
        </span>

        <span
          className="truncate text-[13px]"
          style={{
            fontWeight: isActive ? 600 : isDirectory ? 600 : 400,
            color: isActive
              ? 'var(--color-text-strong)'
              : isDirectory
                ? 'var(--color-text)'
                : 'var(--color-text)',
          }}
        >
          {entry.name}
        </span>

        {isOpenTab && !isDirectory && !isActive && (
          <span
            className="w-1.5 h-1.5 rounded-full ml-1.5 shrink-0"
            style={{ background: 'var(--color-text-subtle)' }}
            aria-label="Open in editor"
          />
        )}

        {hovered && (
          <button
            type="button"
            aria-label={`Delete ${entry.name}`}
            title="Delete"
            className="ide-icon-button ml-auto shrink-0"
            style={{ width: 18, height: 18 }}
            onClick={handleDelete}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {isDirectory && isExpanded && entry.children && entry.children.length > 0 && (
        <div role="group">
          {sortEntries(entry.children).map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              workspaceRoot={workspaceRoot}
            />
          ))}
        </div>
      )}

      {isDirectory && isExpanded && entry.children && entry.children.length === 0 && (
        <div
          className="text-[12px] italic py-0.5"
          style={{ paddingLeft: depth * 12 + 30, color: 'var(--color-text-subtle)' }}
        >
          empty
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC = () => {
  const { rootFiles, loadRootFiles, loading, error } = useExplorerStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const reload = useCallback(() => void loadRootFiles(), [loadRootFiles]);

  useEffect(() => {
    if (workspace) void loadRootFiles();
  }, [workspace, loadRootFiles]);

  // Reload when an agent reports it changed a file.
  const filesChanged = useEditorStore((s) => s.tabs.length);
  void filesChanged;

  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');

  const submitCreate = async (parent: string) => {
    const name = newName.trim();
    setCreating(null);
    setNewName('');
    if (!name) return;
    const target = `${parent.replace(/[\\/]+$/, '')}/${name}`;
    try {
      if (creating === 'file') {
        await fsService.createFile(target);
        await useEditorStore.getState().openFile(target);
      } else {
        await fsService.createDirectory(target);
      }
      await loadRootFiles();
    } catch (err) {
      useWorkspaceStore
        .getState()
        .setError(err instanceof Error ? err.message : 'Could not create that item.');
    }
  };

  if (!workspace) {
    return (
      <div className="p-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        Open a folder to explore it.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-1 px-2 h-8 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="ide-title flex-1 truncate" title={workspace.path}>
          {workspace.name}
        </span>
        <button type="button" className="ide-icon-button" title="New file" aria-label="New file"
          onClick={() => setCreating('file')}>
          <FilePlus size={14} />
        </button>
        <button type="button" className="ide-icon-button" title="New folder" aria-label="New folder"
          onClick={() => setCreating('folder')}>
          <FolderPlus size={14} />
        </button>
        <button type="button" className="ide-icon-button" title="Refresh" aria-label="Refresh" onClick={reload}>
          <RefreshCw size={14} className={loading ? 'anim-spin' : undefined} />
        </button>
      </div>

      {creating && (
        <div className="px-2 py-1.5">
          <input
            autoFocus
            className="ide-input"
            placeholder={creating === 'file' ? 'file name' : 'folder name'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitCreate(workspace.path);
              if (e.key === 'Escape') {
                setCreating(null);
                setNewName('');
              }
            }}
            onBlur={() => {
              setCreating(null);
              setNewName('');
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto ide-scroll py-1" role="tree">
        {error && (
          <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}
        {loading && rootFiles.length === 0 && (
          <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            Loading…
          </div>
        )}
        {!loading && !error && rootFiles.length === 0 && (
          <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            This folder is empty.
          </div>
        )}
        {sortEntries(rootFiles).map((entry) => (
          <FileTreeItem
            key={entry.path}
            entry={entry}
            depth={0}
            workspaceRoot={workspace.path}
          />
        ))}
      </div>
    </div>
  );
};

export default FileTree;
