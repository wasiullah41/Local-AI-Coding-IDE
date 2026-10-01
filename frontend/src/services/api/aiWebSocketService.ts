import { useAIStore } from '../../stores/aiStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { ideSocket } from './ideWebSocket';
import { AgentEvent, AgentTaskSnapshot } from '@local-ide/shared';

let bound = false;

/**
 * Wires agent events from the shared WebSocket into the AI store.
 *
 * Bound once at app start so events keep arriving whether or not the AI panel
 * is currently visible — a task started before the panel is opened is not lost.
 */
export function bindAgentEvents(): void {
  if (bound) return;
  bound = true;

  ideSocket.on((type, data) => {
    if (type === 'agent:event') {
      useAIStore.getState().applyEvent(data as unknown as AgentEvent);
      return;
    }

    if (type === 'agent:task_status') {
      const store = useAIStore.getState();
      // A status frame for the task we are following.
      if (store.taskId && data.taskId === store.taskId) {
        const snapshot = data as unknown as AgentTaskSnapshot;
        if (snapshot.status) store.applySnapshot(snapshot);
      }
    }
  });

  ideSocket.onStatus((status) => {
    useWorkspaceStore.getState().setConnection(status);
  });

  ideSocket.connect();
}
