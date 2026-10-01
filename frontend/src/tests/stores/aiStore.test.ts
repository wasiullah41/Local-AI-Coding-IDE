import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '../../stores/aiStore';
import type { AgentTaskSnapshot } from '@local-ide/shared';

const snapshot = (overrides: Partial<AgentTaskSnapshot> = {}) =>
  ({
    taskId: 'task-1',
    status: 'RUNNING',
    phase: 'RUNNING',
    filesRead: [],
    filesChanged: [],
    result: { summary: null, filesRead: [], filesChanged: [], verification: [], iterations: 0 },
    ...overrides,
  }) as unknown as AgentTaskSnapshot;

describe('aiStore snapshot hydration', () => {
  beforeEach(() => {
    useAIStore.getState().resetTask();
  });

  it('adopts the file lists from a full snapshot', () => {
    useAIStore.getState().applySnapshot(snapshot({ filesRead: ['a.py'], filesChanged: ['b.py'] }));
    expect(useAIStore.getState().filesRead).toEqual(['a.py']);
    expect(useAIStore.getState().filesChanged).toEqual(['b.py']);
  });

  // Regression: the backend broadcasts `{ taskId, status: 'WAITING_PERMISSION' }`
  // with no file lists. Writing those over the store left filesChanged undefined,
  // so the next FILE_CHANGED event threw on `undefined.includes` and the React
  // tree crashed, blanking the whole renderer.
  it('keeps existing lists when a partial status frame omits them', () => {
    useAIStore.getState().applySnapshot(snapshot({ filesRead: ['a.py'], filesChanged: ['b.py'] }));

    const partial = { taskId: 'task-1', status: 'WAITING_PERMISSION' } as unknown as AgentTaskSnapshot;
    useAIStore.getState().applySnapshot(partial);

    const state = useAIStore.getState();
    expect(Array.isArray(state.filesRead)).toBe(true);
    expect(Array.isArray(state.filesChanged)).toBe(true);
    expect(state.filesRead).toEqual(['a.py']);
    expect(state.filesChanged).toEqual(['b.py']);
    expect(state.status).toBe('WAITING_PERMISSION');
  });

  it('does not let a FILE_CHANGED event throw after a partial frame', () => {
    useAIStore.getState().applySnapshot({ taskId: 'task-1', status: 'WAITING_PERMISSION' } as unknown as AgentTaskSnapshot);

    expect(() =>
      useAIStore.getState().applyEvent({
        type: 'FILE_CHANGED',
        taskId: 'task-1',
        phase: 'RUNNING',
        payload: { path: 'new.py' },
      } as never),
    ).not.toThrow();

    expect(useAIStore.getState().filesChanged).toContain('new.py');
  });

  it('keeps the previous phase when the frame omits it', () => {
    useAIStore.getState().applySnapshot(snapshot({ phase: 'EXECUTING' as never }));
    useAIStore.getState().applySnapshot({ taskId: 'task-1', status: 'RUNNING' } as unknown as AgentTaskSnapshot);
    expect(useAIStore.getState().phase).toBe('EXECUTING');
  });

  it('tolerates non-string entries in the lists', () => {
    useAIStore.getState().applySnapshot(snapshot({ filesChanged: ['ok.py', 42, null] as unknown as string[] }));
    expect(useAIStore.getState().filesChanged).toEqual(['ok.py']);
  });
});
