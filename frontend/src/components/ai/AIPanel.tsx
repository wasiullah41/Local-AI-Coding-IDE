import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  Square,
  Trash2,
  History,
  ListTree,
  MessageSquare,
  AlertCircle,
  User,
  Cpu,
  Info,
  Loader2,
} from 'lucide-react';
import { useAIStore } from '../../stores/aiStore';
import { useWorkspaceStore, describeError } from '../../stores/workspaceStore';
import { aiApiService } from '../../services/api/aiApiService';
import { ActivityTimeline } from './ActivityTimeline';
import { PermissionDialog } from './PermissionDialog';

type Tab = 'chat' | 'activity';

const STATUS_TONE: Record<string, string> = {
  IDLE: 'var(--color-text-subtle)',
  QUEUED: 'var(--color-text-muted)',
  PLANNING: 'var(--color-accent)',
  EXECUTING: 'var(--color-accent)',
  RUNNING: 'var(--color-accent)',
  VERIFYING: 'var(--color-accent)',
  WAITING_PERMISSION: 'var(--color-warning)',
  COMPLETED: 'var(--color-success)',
  FAILED: 'var(--color-danger)',
  CANCELLED: 'var(--color-text-muted)',
};

const SUGGESTIONS = [
  'Explain what this project does and where it starts',
  'Find and fix the TypeScript errors',
  'Write tests for the backend services',
  'Add a setting for the editor font size',
];

export const AIPanel: React.FC<{ workspaceRoot: string }> = ({ workspaceRoot }) => {
  const {
    status,
    phase,
    running,
    messages,
    activity,
    filesRead,
    filesChanged,
    error,
    summary,
    taskId,
    provider,
    providerChecked,
    addMessage,
    setTaskId,
    setStatus,
    setRunning,
    setProvider,
    setProviderChecked,
    setError: setAiError,
    newConversation,
  } = useAIStore();

  const setWorkspaceError = useWorkspaceStore((s) => s.setError);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<Tab>('chat');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Provider status is needed before a task is sent, to fail fast with advice.
    if (providerChecked) return;
    let cancelled = false;
    aiApiService
      .getStatus()
      .then((res) => {
        if (!cancelled) setProvider(res.provider);
      })
      .catch(() => {
        if (!cancelled) setProvider(null);
      })
      .finally(() => {
        // Without this the panel re-checks the provider on every mount.
        if (!cancelled) setProviderChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [providerChecked, setProvider, setProviderChecked]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, activity.length, tab]);

  const send = useCallback(
    async (task: string) => {
      const trimmed = task.trim();
      if (!trimmed || running) return;

      setInput('');
      addMessage({ role: 'user', content: trimmed });
      setSending(true);
      setRunning(true);
      setStatus('QUEUED');
      setAiError(null);

      try {
        const res = await aiApiService.runTask(trimmed, workspaceRoot);
        setTaskId(res.taskId);
      } catch (err) {
        const message = describeError(err, 'Could not start the task.');
        setAiError(message);
        setStatus('FAILED');
        setRunning(false);
        addMessage({ role: 'assistant', content: `I could not start: ${message}` });
      } finally {
        setSending(false);
      }
    },
    [addMessage, running, setAiError, setRunning, setStatus, setTaskId, workspaceRoot]
  );

  const cancel = useCallback(async () => {
    if (!taskId) return;
    try {
      await aiApiService.cancelTask(taskId);
    } catch (err) {
      setWorkspaceError(describeError(err, 'Could not cancel the task.'));
    }
  }, [taskId, setWorkspaceError]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  };

  const isBlockedByProvider = providerChecked && provider !== null && !provider.available;

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--color-sidebar)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2 h-9 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className="px-2 h-7 rounded text-[12px] flex items-center gap-1.5"
            style={{
              background: tab === 'chat' ? 'var(--color-active)' : 'transparent',
              color: tab === 'chat' ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
            }}
          >
            <MessageSquare size={13} /> Chat
          </button>
          <button
            type="button"
            onClick={() => setTab('activity')}
            className="px-2 h-7 rounded text-[12px] flex items-center gap-1.5"
            style={{
              background: tab === 'activity' ? 'var(--color-active)' : 'transparent',
              color: tab === 'activity' ? 'var(--color-text-strong)' : 'var(--color-text-muted)',
            }}
          >
            <ListTree size={13} /> Activity
            {activity.length > 0 && (
              <span className="text-[10px] opacity-70">{activity.length}</span>
            )}
          </button>
        </div>
        <div className="flex-1" />
        {messages.length > 0 && (
          <button
            type="button"
            className="ide-icon-button"
            title="New conversation"
            aria-label="New conversation"
            onClick={newConversation}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Status strip */}
      <div
        className="flex items-center gap-2 px-3 h-7 shrink-0 border-b text-[11px]"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-panel)' }}
      >
        {running ? (
          <Loader2 size={12} className="anim-spin" style={{ color: STATUS_TONE[status] }} />
        ) : (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: STATUS_TONE[status] ?? 'var(--color-text-subtle)' }}
          />
        )}
        <span style={{ color: 'var(--color-text-muted)' }}>
          {phase !== 'IDLE' ? phase.replace(/_/g, ' ').toLowerCase() : status.toLowerCase()}
        </span>
        {provider && (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-text-subtle)' }}>
            <Cpu size={11} />
            {provider.model}
          </span>
        )}
        {filesChanged.length > 0 && (
          <span style={{ color: 'var(--color-accent)' }}>
            {filesChanged.length} file{filesChanged.length === 1 ? '' : 's'} changed
          </span>
        )}
        <div className="flex-1" />
        {running && (
          <button
            type="button"
            className="ide-button ide-button--secondary"
            style={{ height: 20, padding: '0 8px', fontSize: 11 }}
            onClick={() => void cancel()}
          >
            <Square size={10} /> Stop
          </button>
        )}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto ide-scroll">
        {tab === 'chat' ? (
          <div className="flex flex-col gap-3 p-3">
            {messages.length === 0 && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={15} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-strong)' }}>
                    Coding agent
                  </span>
                </div>
                <p className="text-[12px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  It reads and edits files in this folder using registered tools, and asks before
                  anything destructive.
                </p>
                {isBlockedByProvider && provider && (
                  <div
                    className="flex items-start gap-2 p-2 rounded text-[12px] mb-3"
                    style={{
                      background: 'var(--color-elevated)',
                      border: '1px solid var(--color-warning)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <AlertCircle size={14} className="mt-px shrink-0" style={{ color: 'var(--color-warning)' }} />
                    <span>{provider.message ?? 'No model provider is reachable.'}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="text-left px-2 py-1.5 rounded text-[12px] flex items-center gap-2"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <History size={12} className="shrink-0" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="flex gap-2 anim-slide-up">
                <span
                  className="flex items-center justify-center w-5 h-5 rounded shrink-0"
                  style={{
                    background: message.role === 'user' ? 'var(--color-elevated)' : 'var(--color-accent-muted)',
                    color: message.role === 'user' ? 'var(--color-text-muted)' : 'var(--color-accent)',
                  }}
                >
                  {message.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    data-selectable
                    className="text-[13px] whitespace-pre-wrap break-words"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {message.content}
                  </div>
                  {message.isSummary && summary && filesRead.length + filesChanged.length > 0 && (
                    <div
                      className="mt-2 p-2 rounded text-[11px]"
                      style={{ background: 'var(--color-elevated)', color: 'var(--color-text-muted)' }}
                    >
                      <div className="ide-title mb-1">Context used</div>
                      <div>{filesRead.length} read · {filesChanged.length} changed</div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {running && messages.length > 0 && activity.length > 0 && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 size={12} className="anim-spin" />
                {activity[activity.length - 1]?.title ?? 'Working…'}
              </div>
            )}
          </div>
        ) : (
          <ActivityTimeline activity={activity} live={running} />
        )}

        {error && (
          <div
            className="mx-3 mb-3 p-2 rounded text-[12px] flex gap-2"
            style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
          >
            <AlertCircle size={13} className="shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        {tab === 'activity' && filesChanged.length > 0 && (
          <div className="px-3 pb-3">
            <div className="ide-title mb-1 mt-1">Files changed</div>
            <ul className="flex flex-col gap-0.5">
              {filesChanged.map((path) => (
                <li
                  key={path}
                  className="text-[11px] truncate"
                  style={{ color: 'var(--color-text-muted)' }}
                  title={path}
                >
                  {path.split(/[\\/]/).pop()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 p-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="rounded flex items-end gap-1 p-1"
          style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
        >
          <textarea
            ref={inputRef}
            data-selectable
            rows={2}
            value={input}
            disabled={running}
            placeholder={running ? 'The agent is working…' : 'Ask for a change, or describe a bug'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] px-1.5 py-1"
            style={{ color: 'var(--color-text)' }}
          />
          <button
            type="button"
            className="ide-button ide-button--primary shrink-0"
            style={{ height: 24 }}
            disabled={running || sending || !input.trim()}
            onClick={() => void send(input)}
            title="Send (Enter)"
            aria-label="Send"
          >
            <Send size={12} />
          </button>
        </div>
        <p className="mt-1 px-1 text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-subtle)' }}>
          <Info size={10} />
          Enter to send · Shift+Enter for a new line
        </p>
      </div>

      <PermissionDialog />
    </div>
  );
};

export default AIPanel;
