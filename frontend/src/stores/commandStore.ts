import { create } from 'zustand';

interface Command {
  id: string;
  title: string;
  action: () => void;
}

interface CommandState {
  commands: Command[];
  registerCommand: (id: string, title: string, action: () => void) => void;
  executeCommand: (id: string) => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  commands: [],
  registerCommand: (id, title, action) =>
    set((state) => ({ commands: [...state.commands, { id, title, action }] })),
  executeCommand: (id) => {
    const command = get().commands.find((c) => c.id === id);
    if (command) {
      command.action();
    }
  },
}));
