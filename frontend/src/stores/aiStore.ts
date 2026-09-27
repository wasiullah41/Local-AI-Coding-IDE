import { create } from 'zustand';
import { AgentStatus, AgentEvent } from '@local-ide/shared';

interface AIStore {
  taskId: string | null;
  status: AgentStatus | 'IDLE';
  messages: { role: 'user' | 'assistant' | 'tool'; content: string }[];
  events: AgentEvent[];
  setTaskId: (taskId: string) => void;
  setStatus: (status: AgentStatus | 'IDLE') => void;
  addMessage: (message: { role: 'user' | 'assistant' | 'tool'; content: string }) => void;
  addEvent: (event: AgentEvent) => void;
  cancelTask: () => void;
  resetTask: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  taskId: null,
  status: 'IDLE',
  messages: [],
  events: [],
  setTaskId: (taskId) => set({ taskId }),
  setStatus: (status) => set({ status }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  cancelTask: () => set({ status: 'CANCELLED' }),
  resetTask: () => set({ taskId: null, status: 'IDLE', messages: [], events: [] }),
}));
