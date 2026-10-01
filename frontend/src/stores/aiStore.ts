import { create } from 'zustand';
import {
  AgentActivityItem,
  AgentEvent,
  AgentPhase,
  AgentStatus,
  AgentTaskSnapshot,
  LLMProviderStatus,
  PermissionRequest,
} from '@local-ide/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** Set on the assistant's closing message of a task. */
  isSummary?: boolean;
}

interface AIState {
  taskId: string | null;
  status: AgentStatus;
  phase: AgentPhase;
  messages: ChatMessage[];
  activity: AgentActivityItem[];
  pendingPermission: PermissionRequest | null;
  filesRead: string[];
  filesChanged: string[];
  error: string | null;
  summary: string | null;
  provider: LLMProviderStatus | null;
  providerChecked: boolean;
  running: boolean;

  // --- actions
  setTaskId: (taskId: string | null) => void;
  setStatus: (status: AgentStatus) => void;
  setPhase: (phase: AgentPhase) => void;
  setRunning: (running: boolean) => void;
  setProvider: (provider: LLMProviderStatus | null) => void;
  setProviderChecked: (checked: boolean) => void;
  setError: (error: string | null) => void;

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string }) => void;
  addActivity: (item: Omit<AgentActivityItem, 'id' | 'timestamp'> & { id?: string }) => void;
  updateActivity: (id: string, patch: Partial<AgentActivityItem>) => void;
  setPendingPermission: (request: PermissionRequest | null) => void;
  addFileRead: (path: string) => void;
  addFileChanged: (path: string) => void;
  setSummary: (summary: string | null) => void;

  applyEvent: (event: AgentEvent) => void;
  applySnapshot: (snapshot: AgentTaskSnapshot) => void;
  resetTask: () => void;
  newConversation: () => void;
}

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

const initialState = {
  taskId: null,
  status: 'IDLE' as AgentStatus,
  phase: 'IDLE' as AgentPhase,
  messages: [] as ChatMessage[],
  activity: [] as AgentActivityItem[],
  pendingPermission: null as PermissionRequest | null,
  filesRead: [] as string[],
  filesChanged: [] as string[],
  error: null as string | null,
  summary: null as string | null,
  running: false,
};

const pushUnique = (list: string[], value: string) => {
  const safe = Array.isArray(list) ? list : [];
  return safe.includes(value) ? safe : [...safe, value];
};

/**
 * The backend broadcasts partial status frames (for example
 * `{ taskId, status: 'WAITING_PERMISSION' }`), so the file lists can be absent.
 * Keep whatever the panel already had instead of writing `undefined` over it.
 */
const mergePaths = (incoming: unknown, current: string[]) =>
  Array.isArray(incoming)
    ? incoming.filter((path): path is string => typeof path === 'string')
    : current;

export const useAIStore = create<AIState>((set, get) => ({
  ...initialState,
  provider: null,
  providerChecked: false,

  setTaskId: (taskId) => set({ taskId }),
  setStatus: (status) => set({ status, running: status === 'QUEUED' || status === 'RUNNING' || status === 'WAITING_PERMISSION' }),
  setPhase: (phase) => set({ phase }),
  setRunning: (running) => set({ running }),
  setProvider: (provider) => set({ provider }),
  setProviderChecked: (providerChecked) => set({ providerChecked }),
  setError: (error) => set({ error }),
  setSummary: (summary) => set({ summary }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: message.id ?? nextId('msg'),
          timestamp: Date.now(),
          role: message.role,
          content: message.content,
          isSummary: message.isSummary,
        },
      ],
    })),

  addActivity: (item) =>
    set((state) => ({
      activity: [
        ...state.activity,
        { id: item.id ?? nextId('act'), timestamp: Date.now(), ...item },
      ].slice(-300),
    })),

  updateActivity: (id, patch) =>
    set((state) => ({
      activity: state.activity.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  setPendingPermission: (pendingPermission) => set({ pendingPermission }),

  addFileRead: (path) => set((state) => ({ filesRead: pushUnique(state.filesRead, path) })),
  addFileChanged: (path) => set((state) => ({ filesChanged: pushUnique(state.filesChanged, path) })),

  /**
   * Folds one backend event into the timeline. Every task-relevant event also
   * lands here, so the panel is a faithful record of what the agent did rather
   * than a decorative log.
   */
  applyEvent: (event) => {
    const state = get();
    const payload = event.payload ?? {};

    if (state.taskId && event.taskId !== state.taskId) return;
    if (event.phase) set({ phase: event.phase });

    switch (event.type) {
      case 'TASK_QUEUED':
        set({ status: 'QUEUED', running: true, error: null });
        get().addActivity({ kind: 'info', title: 'Task queued', status: 'pending' });
        break;

      case 'TASK_STARTED':
        set({ status: 'RUNNING', running: true, error: null });
        get().addActivity({ kind: 'thought', title: 'Working out an approach', status: 'running' });
        break;

      case 'PLAN_CREATED':
        for (const step of (payload.plan as string[]) ?? []) {
          get().addActivity({ kind: 'thought', title: `Plan: ${step}`, status: 'pending' });
        }
        break;

      case 'THINKING':
        set({ status: 'RUNNING', running: true });
        break;

      case 'TOOL_STARTED': {
        const tool = String(payload.tool ?? 'tool');
        const title = String(payload.title ?? tool);
        set({ status: 'RUNNING', running: true });
        get().addActivity({ kind: 'tool', title, tool, status: 'running' });
        break;
      }

      case 'TOOL_RESULT': {
        const tool = String(payload.tool ?? 'tool');
        const success = payload.success !== false;
        const denied = payload.denied === true;
        const summary = typeof payload.summary === 'string' ? payload.summary : undefined;
        const errorText = typeof payload.error === 'string' ? payload.error : undefined;

        // Update the matching running entry so the row resolves in place.
        const running = [...state.activity]
          .reverse()
          .find((item) => item.tool === tool && item.status === 'running');

        if (running) {
          get().updateActivity(running.id, {
            status: success ? 'success' : denied ? 'skipped' : 'error',
            detail: denied ? 'Denied by you' : success ? summarise(summary, payload.data) : errorText,
            title: running.title,
          });
        } else {
          get().addActivity({
            kind: denied ? 'warning' : success ? 'success' : 'error',
            title: tool,
            tool,
            status: denied ? 'skipped' : success ? 'success' : 'error',
            detail: denied ? 'Denied by you' : success ? summarise(summary, payload.data) : errorText,
          });
        }

        if (denied) {
          get().addActivity({
            kind: 'warning',
            title: 'Action denied — the agent will not retry it',
            status: 'error',
          });
        }
        break;
      }

      case 'FILE_CHANGED': {
        const path = String(payload.path ?? '');
        if (path) get().addFileChanged(path);
        break;
      }

      case 'VERIFICATION_STARTED':
        get().addActivity({ kind: 'tool', title: 'Verifying the change', status: 'running' });
        break;

      case 'PERMISSION_REQUESTED':
        set({ status: 'WAITING_PERMISSION', running: true, pendingPermission: payload as unknown as PermissionRequest });
        break;

      case 'PERMISSION_RESOLVED': {
        const allowed = payload.allowed === true;
        set({ pendingPermission: null, status: 'RUNNING' });
        get().addActivity({
          kind: allowed ? 'success' : 'warning',
          title: allowed ? 'You allowed the action' : 'You denied the action',
          status: allowed ? 'success' : 'error',
          tool: typeof payload.tool === 'string' ? payload.tool : undefined,
        });
        break;
      }

      case 'TASK_COMPLETED': {
        const content = typeof payload.content === 'string' ? payload.content : '';
        set({
          status: 'COMPLETED',
          phase: 'COMPLETED',
          running: false,
          pendingPermission: null,
          summary: content,
        });
        if (Array.isArray(payload.filesRead)) {
          for (const path of payload.filesRead as string[]) get().addFileRead(path);
        }
        if (Array.isArray(payload.filesChanged)) {
          for (const path of payload.filesChanged as string[]) get().addFileChanged(path);
        }
        get().addActivity({ kind: 'success', title: 'Task completed', status: 'success' });
        get().addMessage({ role: 'assistant', content, isSummary: true });
        break;
      }

      case 'TASK_FAILED': {
        const message = String(payload.error ?? 'The task failed.');
        set({
          status: 'FAILED',
          phase: 'FAILED',
          running: false,
          pendingPermission: null,
          error: message,
        });
        get().addActivity({ kind: 'error', title: 'Task failed', detail: message, status: 'error' });
        break;
      }

      case 'TASK_CANCELLED':
        set({
          status: 'CANCELLED',
          phase: 'CANCELLED',
          running: false,
          pendingPermission: null,
          error: null,
        });
        get().addActivity({ kind: 'warning', title: 'Task cancelled', status: 'error' });
        break;

      default:
        break;
    }
  },

  /** Reconciles UI state with an authoritative backend snapshot. */
  applySnapshot: (snapshot) => {
    const state = get();
    set({
      taskId: snapshot.taskId,
      status: snapshot.status,
      phase: snapshot.phase ?? state.phase,
      filesRead: mergePaths(snapshot.filesRead, state.filesRead),
      filesChanged: mergePaths(snapshot.filesChanged, state.filesChanged),
      error: snapshot.error ?? null,
      summary: snapshot.result?.summary ?? null,
      running:
        snapshot.status === 'QUEUED' ||
        snapshot.status === 'RUNNING' ||
        snapshot.status === 'WAITING_PERMISSION',
      pendingPermission: null,
    });
  },

  resetTask: () => set({ ...initialState, messages: get().messages }),

  newConversation: () => set({ ...initialState }),
}));

/** Keeps tool detail readable and short. */
function summarise(summary: unknown, data: unknown): string | undefined {
  if (typeof summary === 'string' && summary.length > 0) {
    return summary.length > 220 ? `${summary.slice(0, 220)}…` : summary;
  }
  if (typeof data === 'string') {
    return data.length > 220 ? `${data.slice(0, 220)}…` : data;
  }
  if (data && typeof data === 'object' && 'preview' in (data as object)) {
    return String((data as { preview: string }).preview).slice(0, 220);
  }
  return undefined;
}
