import React, { useState } from 'react';
import {
  Check,
  Circle,
  Loader2,
  X,
  AlertTriangle,
  Ban,
  Wrench,
  MessageSquare,
  FilePlus2,
  AlertCircle,
  ShieldQuestion,
} from 'lucide-react';
import type { AgentActivityItem } from '@local-ide/shared';

const KIND_ICON: Record<AgentActivityItem['kind'], React.ElementType> = {
  thought: MessageSquare,
  tool: Wrench,
  file: FilePlus2,
  permission: ShieldQuestion,
  info: Circle,
  success: Check,
  error: AlertCircle,
  warning: AlertTriangle,
};

const KIND_COLOR: Record<AgentActivityItem['kind'], string> = {
  thought: 'var(--color-text-muted)',
  tool: 'var(--color-accent)',
  file: 'var(--color-accent)',
  permission: 'var(--color-warning)',
  info: 'var(--color-text-subtle)',
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
};

const relativeTime = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

interface ActivityTimelineProps {
  activity: AgentActivityItem[];
  /** Highlight the newest entry while the task runs. */
  live: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activity, live }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (activity.length === 0) {
    return (
      <p className="text-[12px] px-3 py-4" style={{ color: 'var(--color-text-subtle)' }}>
        Tool calls and file changes appear here while the agent works.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {activity.map((item, index) => {
        const Icon = KIND_ICON[item.kind] ?? Circle;
        const isLast = index === activity.length - 1;
        const hasDetail = Boolean(item.detail);

        return (
          <li key={item.id} className="relative flex gap-2 px-3 py-1.5">
            {/* Connector line between entries */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[18px] top-[22px] bottom-[-6px] w-px"
                style={{ background: 'var(--color-border)' }}
              />
            )}

            <span
              className="relative z-[1] flex items-center justify-center w-3.5 h-3.5 mt-[2px] shrink-0 rounded-full"
              style={{
                background: 'var(--color-editor-background)',
                color: KIND_COLOR[item.kind],
              }}
            >
              {item.status === 'running' ? (
                <Loader2 size={12} className="anim-spin" />
              ) : item.status === 'skipped' ? (
                <Ban size={11} />
              ) : (
                <Icon size={12} />
              )}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[12px] truncate flex-1"
                  style={{
                    color:
                      item.status === 'error'
                        ? 'var(--color-danger)'
                        : item.status === 'skipped'
                          ? 'var(--color-text-subtle)'
                          : 'var(--color-text)',
                    textDecoration: item.status === 'skipped' ? 'line-through' : undefined,
                  }}
                >
                  {item.title}
                </span>
                {item.tool && (
                  <span
                    className="text-[10px] px-1 rounded shrink-0"
                    style={{
                      background: 'var(--color-elevated)',
                      color: 'var(--color-text-subtle)',
                    }}
                  >
                    {item.tool}
                  </span>
                )}
                {live && isLast && item.status === 'running' ? null : (
                  <time
                    className="text-[10px] shrink-0"
                    style={{ color: 'var(--color-text-subtle)' }}
                    title={new Date(item.timestamp).toLocaleTimeString()}
                  >
                    {relativeTime(item.timestamp)}
                  </time>
                )}
              </div>

              {hasDetail && (
                <>
                  <button
                    type="button"
                    className="text-[11px] mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                    onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  >
                    {expanded[item.id] ? 'Hide detail' : 'Show detail'}
                  </button>
                  {expanded[item.id] && (
                    <pre
                      data-selectable
                      className="mt-1 p-2 rounded text-[11px] whitespace-pre-wrap break-words anim-fade-in"
                      style={{
                        background: 'var(--color-elevated)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        maxHeight: 220,
                        overflow: 'auto',
                      }}
                    >
                      {item.detail}
                    </pre>
                  )}
                </>
              )}

              {item.status === 'error' && item.kind === 'warning' && null}
            </div>

            {item.status === 'error' && item.kind === 'error' && (
              <X size={12} className="mt-1 shrink-0" style={{ color: 'var(--color-danger)' }} />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default ActivityTimeline;
