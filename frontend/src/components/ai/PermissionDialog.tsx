import React, { useEffect, useState } from 'react';
import { ShieldAlert, Check, X, Clock } from 'lucide-react';
import { useAIStore } from '../../stores/aiStore';
import { aiApiService } from '../../services/api/aiApiService';
import { useWorkspaceStore } from '../../stores/workspaceStore';

const timeRemaining = (expiresAt?: number): number | null => {
  if (!expiresAt) return null;
  return Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
};

/**
 * Blocking confirmation for a tool the agent wants to run.
 *
 * The backend holds the tool call open until this answers, and auto-denies when
 * the countdown runs out, so silence is treated as "no".
 */
export const PermissionDialog: React.FC = () => {
  const pendingPermission = useAIStore((s) => s.pendingPermission);
  const setPendingPermission = useAIStore((s) => s.setPendingPermission);
  const setError = useWorkspaceStore((s) => s.setError);

  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const requestId = pendingPermission?.requestId;
  const toolArgs = (pendingPermission?.args ?? {}) as Record<string, unknown>;

  useEffect(() => {
    if (!pendingPermission) {
      setRemaining(null);
      return;
    }
    setRemaining(timeRemaining(pendingPermission.expiresAt));
    const timer = window.setInterval(() => {
      const next = timeRemaining(pendingPermission.expiresAt);
      setRemaining(next);
      if (next === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pendingPermission]);

  const respond = async (allowed: boolean, remember: boolean) => {
    if (!requestId || busy) return;
    setBusy(true);
    try {
      await aiApiService.respondPermission(requestId, allowed, remember);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not send your answer.');
    } finally {
      setBusy(false);
      setPendingPermission(null);
    }
  };

  if (!pendingPermission) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-title"
    >
      <div
        className="w-full max-w-md rounded-lg shadow-2xl anim-scale-in"
        style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--color-border-strong)',
        }}
      >
        <div
          className="flex items-center gap-2 px-4 h-10 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <ShieldAlert size={15} style={{ color: 'var(--color-warning)' }} />
          <h2 id="permission-title" className="text-[13px] font-semibold" style={{ color: 'var(--color-text-strong)' }}>
            The agent wants your permission
          </h2>
          {remaining !== null && (
            <span
              className="ml-auto flex items-center gap-1 text-[11px]"
              style={{ color: remaining <= 10 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
            >
              <Clock size={11} />
              {remaining}s
            </span>
          )}
        </div>

        <div className="px-4 py-3">
          <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-mono" style={{ color: 'var(--color-text)' }}>
              {pendingPermission.tool}
            </span>{' '}
            — {pendingPermission.action}
          </p>
          <pre
            data-selectable
            className="text-[11px] p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap break-words"
            style={{
              background: 'var(--color-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {Object.keys(toolArgs).length > 0
              ? JSON.stringify(toolArgs, null, 2)
              : pendingPermission.detail ?? 'No arguments.'}
          </pre>
          {pendingPermission.reason && (
            <p className="text-[11px] mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>
              The agent says: {pendingPermission.reason}
            </p>
          )}
          <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>
            Nothing runs without your answer. Expired requests are denied automatically.
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            disabled={busy}
            className="ide-button ide-button--primary"
            onClick={() => void respond(true, false)}
          >
            <Check size={13} /> Allow once
          </button>
          <button
            type="button"
            disabled={busy}
            className="ide-button ide-button--secondary"
            onClick={() => void respond(true, true)}
            title="Allow this tool for the rest of this task"
          >
            Always allow
          </button>
          <div className="flex-1" />
          <button
            type="button"
            disabled={busy}
            className="ide-button ide-button--danger"
            onClick={() => void respond(false, false)}
          >
            <X size={13} /> Deny
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDialog;
