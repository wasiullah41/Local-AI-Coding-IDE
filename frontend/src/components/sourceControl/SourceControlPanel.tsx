import React, { useMemo, useState } from 'react';
import { GitBranch, RefreshCw, Plus, Minus, Check, FileDiff, X } from 'lucide-react';
import { useGitStore } from '../../stores/gitStore';
import type { GitFileChange, GitFileStatus } from '@local-ide/shared';

const STATUS_LABEL: Record<GitFileStatus, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  conflicted: '!',
};

const STATUS_COLOR: Record<GitFileStatus, string> = {
  modified: 'var(--color-warning)',
  added: 'var(--color-success)',
  deleted: 'var(--color-danger)',
  renamed: 'var(--color-accent)',
  untracked: 'var(--color-text-muted)',
  conflicted: 'var(--color-danger)',
};

const DiffViewer: React.FC<{ diff: string; path: string }> = ({ diff, path }) => {
  const lines = useMemo(() => diff.split('\n'), [diff]);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div
        className="flex items-center gap-2 px-3 h-7 shrink-0"
        style={{ background: 'var(--color-elevated)', borderBottom: '1px solid var(--color-border)' }}
      >
        <FileDiff size={12} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-[11px] truncate flex-1" style={{ color: 'var(--color-text)' }} title={path}>
          {path}
        </span>
        <button
          type="button"
          className="ide-icon-button"
          style={{ width: 18, height: 18 }}
          aria-label="Close diff"
          onClick={() => useGitStore.getState().clearDiff()}
        >
          <X size={11} />
        </button>
      </div>
      <pre
        data-selectable
        className="flex-1 min-h-0 overflow-auto ide-scroll text-[11px] font-mono"
        style={{ background: 'var(--color-editor-background)' }}
      >
        {lines.map((line, index) => {
          const isAdded = line.startsWith('+') && !line.startsWith('+++');
          const isRemoved = line.startsWith('-') && !line.startsWith('---');
          const isHunk = line.startsWith('@@');
          const isMeta = line.startsWith('+++') || line.startsWith('---');
          return (
            <div
              key={index}
              style={{
                background: isAdded
                  ? 'var(--color-accent-soft)'
                  : isRemoved
                    ? 'rgba(241, 76, 76, 0.12)'
                    : 'transparent',
                color: isHunk
                  ? 'var(--color-accent)'
                  : isMeta
                    ? 'var(--color-text-muted)'
                    : isAdded
                      ? 'var(--color-success)'
                      : isRemoved
                        ? 'var(--color-danger)'
                        : 'var(--color-text)',
              }}
            >
              {line || ' '}
            </div>
          );
        })}
      </pre>
    </div>
  );
};

const ChangeRow: React.FC<{
  change: GitFileChange;
  selected: boolean;
  onSelect: () => void;
  onStage: () => void;
  onUnstage: () => void;
}> = ({ change, selected, onSelect, onStage, onUnstage }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    className="flex items-center gap-1.5 h-[22px] px-2 cursor-pointer"
    style={{
      background: selected ? 'var(--color-active)' : 'transparent',
      color: 'var(--color-text)',
    }}
    onMouseEnter={(e) => {
      if (!selected) e.currentTarget.style.background = 'var(--color-hover)';
    }}
    onMouseLeave={(e) => {
      if (!selected) e.currentTarget.style.background = 'transparent';
    }}
  >
    <span
      className="w-3 text-center text-[11px] font-semibold shrink-0"
      style={{ color: STATUS_COLOR[change.status] }}
      title={change.status}
    >
      {STATUS_LABEL[change.status]}
    </span>
    <span className="text-[12px] truncate flex-1" title={change.path}>
      {change.relativePath}
    </span>
    <button
      type="button"
      className="ide-icon-button shrink-0"
      style={{ width: 18, height: 18 }}
      title={change.staged ? 'Unstage changes' : 'Stage changes'}
      aria-label={change.staged ? `Unstage ${change.relativePath}` : `Stage ${change.relativePath}`}
      onClick={(event) => {
        event.stopPropagation();
        if (change.staged) onUnstage();
        else onStage();
      }}
    >
      {change.staged ? <Minus size={12} /> : <Plus size={12} />}
    </button>
  </div>
);

export const SourceControlPanel: React.FC = () => {
  const { status, loading, error, diff, diffLoading, selectedFile, refresh, loadDiff, clearDiff, stage, unstage, commit } =
    useGitStore();
  const [message, setMessage] = useState('');
  const [committing, setCommitting] = useState(false);

  const staged = status?.changes.filter((c) => c.staged) ?? [];
  const unstaged = status?.changes.filter((c) => !c.staged) ?? [];

  if (error && !status) {
    return (
      <p className="p-3 text-[12px]" style={{ color: 'var(--color-danger)' }}>
        {error}
      </p>
    );
  }

  if (status && !status.isRepository) {
    return (
      <p className="p-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        This folder is not a Git repository.
      </p>
    );
  }

  const handleCommit = async () => {
    if (!message.trim()) return;
    setCommitting(true);
    try {
      await commit(message);
      setMessage('');
    } catch {
      // The store surfaces the failure.
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto ide-scroll">
        <div
          className="flex items-center gap-1.5 px-3 py-2 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {status?.currentBranch && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              <GitBranch size={11} />
              {status.currentBranch}
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            className="ide-icon-button"
            title="Refresh"
            aria-label="Refresh status"
            onClick={() => void refresh()}
          >
            <RefreshCw size={13} className={loading ? 'anim-spin' : undefined} />
          </button>
        </div>

        <div className="p-2">
          <textarea
            data-selectable
            rows={2}
            className="ide-input resize-none"
            placeholder="Message (Ctrl+Enter to commit)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleCommit();
              }
            }}
          />
          <button
            type="button"
            className="ide-button ide-button--primary w-full mt-1.5"
            disabled={!message.trim() || staged.length === 0 || committing}
            onClick={() => void handleCommit()}
            title={
              staged.length === 0
                ? 'Stage at least one file first'
                : `Commit ${staged.length} file(s)`
            }
          >
            <Check size={13} />
            {committing ? 'Committing…' : `Commit${staged.length ? ` (${staged.length})` : ''}`}
          </button>
        </div>

        {unstaged.length > 0 && (
          <>
            <div className="ide-title px-3 py-1.5 flex items-center gap-1.5" style={{ background: 'var(--color-editor-background)' }}>
              Changes <span style={{ color: 'var(--color-text-subtle)' }}>{unstaged.length}</span>
            </div>
            {unstaged.map((change) => (
              <ChangeRow
                key={change.path}
                change={change}
                selected={selectedFile === change.path}
                onSelect={() => {
                  if (selectedFile === change.path) {
                    clearDiff();
                  } else {
                    void loadDiff(change.path);
                  }
                }}
                onStage={() => void stage(change.path)}
                onUnstage={() => void unstage(change.path)}
              />
            ))}
          </>
        )}

        {staged.length > 0 && (
          <>
            <div
              className="ide-title px-3 py-1.5 flex items-center gap-1.5 border-t"
              style={{ background: 'var(--color-editor-background)', borderColor: 'var(--color-border)' }}
            >
              Staged <span style={{ color: 'var(--color-text-subtle)' }}>{staged.length}</span>
            </div>
            {staged.map((change) => (
              <ChangeRow
                key={change.path}
                change={change}
                selected={selectedFile === change.path}
                onSelect={() => {
                  if (selectedFile === change.path) {
                    clearDiff();
                  } else {
                    void loadDiff(change.path);
                  }
                }}
                onStage={() => void stage(change.path)}
                onUnstage={() => void unstage(change.path)}
              />
            ))}
          </>
        )}

        {status && status.changes.length === 0 && (
          <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            No changes. The working tree is clean.
          </p>
        )}

        {loading && !status && (
          <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
            Reading status…
          </p>
        )}
      </div>

      {diffLoading && (
        <div className="p-2 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
          Loading diff…
        </div>
      )}

      {diff !== null && selectedFile && <DiffViewer diff={diff} path={selectedFile} />}
    </div>
  );
};

export default SourceControlPanel;
