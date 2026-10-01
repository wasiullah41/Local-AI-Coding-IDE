import React, { Suspense, useMemo } from 'react';
import { ChevronRight, FileCode2, FolderOpen, Loader2 } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAIStore } from '../../stores/aiStore';
import { WelcomeView } from './WelcomeView';
import { TabBar } from '../layout/TabBar';

// Monaco and its language workers are several megabytes, so the editor is only
// fetched once a file is actually opened. The rest of the shell starts without it.
const MonacoEditor = React.lazy(() => import('./MonacoEditor'));

interface EditorAreaProps {
  onStartTask: (task: string) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({ onStartTask }) => {
  const { tabs, activeTabPath } = useEditorStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const filesChanged = useAIStore((s) => s.filesChanged);

  const activeTab = tabs.find((tab) => tab.path === activeTabPath);

  const breadcrumbs = useMemo(() => {
    if (!activeTab) return [];
    const base = workspace?.path;
    const relative =
      base && activeTab.path.startsWith(base)
        ? activeTab.path.slice(base.length).replace(/^[\\/]/, '')
        : activeTab.path;
    return relative.split(/[\\/]/);
  }, [activeTab, workspace?.path]);

  // Show which files the agent touched, so an unexplained change is traceable.
  const agentTouched = useMemo(
    () => new Set(filesChanged.map((p) => p.toLowerCase())),
    [filesChanged]
  );

  return (
    <div className="flex flex-col h-full min-w-0" style={{ background: 'var(--color-editor-background)' }}>
      <TabBar />

      {activeTab && (
        <div
          className="flex items-center gap-1 px-3 h-7 shrink-0 text-[11px] border-b"
          style={{ background: 'var(--color-editor-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          {workspace && <FolderOpen size={12} className="shrink-0" />}
          {breadcrumbs.map((segment, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`${segment}-${index}`}>
                {index > 0 && <ChevronRight size={12} className="shrink-0 opacity-60" />}
                <span
                  className="truncate"
                  style={{
                    color: isLast ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontWeight: isLast ? 500 : 400,
                  }}
                >
                  {segment}
                </span>
              </React.Fragment>
            );
          })}
          {agentTouched.has(activeTab.path.toLowerCase()) && (
            <span
              className="ml-2 flex items-center gap-1 shrink-0"
              style={{ color: 'var(--color-accent)' }}
              title="The AI agent changed this file"
            >
              <FileCode2 size={11} />
              agent-modified
            </span>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 editor-surface">
        {activeTab ? (
          <Suspense
            fallback={
              <div
                className="flex h-full items-center justify-center gap-2 text-[12px]"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                <Loader2 size={14} className="animate-spin" />
                Loading editor…
              </div>
            }
          >
            <MonacoEditor />
          </Suspense>
        ) : (
          <WelcomeView onStartTask={onStartTask} />
        )}
      </div>
    </div>
  );
};

export default EditorArea;
