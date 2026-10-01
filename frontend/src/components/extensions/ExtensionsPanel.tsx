import React, { useCallback, useEffect, useState } from 'react';
import { Puzzle, RefreshCw, Check, Power, Settings2 } from 'lucide-react';
import type { ExtensionSummary } from '@local-ide/shared';
import { apiService, unwrap, apiErrorMessage } from '../../services/api/apiService';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export const ExtensionsPanel: React.FC = () => {
  const [extensions, setExtensions] = useState<ExtensionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const setError = useWorkspaceStore((s) => s.setError);

  const fetchExtensions = useCallback(async () => {
    setLoading(true);
    try {
      setExtensions(await unwrap<ExtensionSummary[]>(apiService.get('/extensions')));
    } catch (error) {
      setError(apiErrorMessage(error, 'Could not load extensions.'));
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    void fetchExtensions();
  }, [fetchExtensions]);

  const toggle = async (id: string, enabled: boolean) => {
    setBusy(id);
    try {
      await apiService.post(`/extensions/${id}/${enabled ? 'disable' : 'enable'}`);
      await fetchExtensions();
    } catch (error) {
      setError(apiErrorMessage(error, 'Could not change the extension.'));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <p className="p-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
        Loading extensions…
      </p>
    );
  }

  if (extensions.length === 0) {
    return (
      <div className="p-3">
        <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
          No extensions are installed.
        </p>
        <button type="button" className="ide-button ide-button--secondary" onClick={() => void fetchExtensions()}>
          <RefreshCw size={12} /> Check again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto ide-scroll">
        {extensions.map((ext) => (
          <div
            key={ext.id}
            className="flex gap-2 px-3 py-2 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded shrink-0"
              style={{ background: 'var(--color-elevated)', color: 'var(--color-text-muted)' }}
            >
              {ext.builtin ? <Puzzle size={12} /> : <Settings2 size={12} />}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-strong)' }}>
                  {ext.displayName}
                </span>
                {ext.builtin && (
                  <span
                    className="text-[10px] px-1 rounded"
                    style={{ background: 'var(--color-elevated)', color: 'var(--color-text-subtle)' }}
                  >
                    built-in
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {ext.description || 'No description provided.'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                {ext.name} v{ext.version} · {ext.author}
              </p>
            </div>

            <button
              type="button"
              disabled={busy === ext.id}
              className="ide-button shrink-0"
              style={{
                height: 22,
                fontSize: 11,
                background: ext.enabled ? 'var(--color-elevated)' : 'var(--color-accent)',
                color: ext.enabled ? 'var(--color-text)' : '#fff',
              }}
              onClick={() => void toggle(ext.id, ext.enabled)}
              title={ext.enabled ? 'Disable' : 'Enable'}
            >
              {ext.enabled ? <Power size={11} /> : <Check size={11} />}
              {ext.enabled ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtensionsPanel;
