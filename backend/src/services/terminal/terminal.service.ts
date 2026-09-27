import { v4 as uuidv4 } from 'uuid';

export interface TerminalSessionInfo {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  pid?: number;
  status: 'running' | 'exited';
  exitCode?: number;
  createdAt: string;
}

// Terminal sessions are managed via WebSocket with node-pty
// This service tracks metadata only; actual PTY instances are in terminal.socket.ts

export class TerminalService {
  private sessions: Map<string, TerminalSessionInfo> = new Map();

  createSession(shell: string, cwd: string, name?: string): TerminalSessionInfo {
    const id = uuidv4();
    const session: TerminalSessionInfo = {
      id,
      name: name || `Terminal ${this.sessions.size + 1}`,
      shell,
      cwd,
      status: 'running',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): TerminalSessionInfo | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): TerminalSessionInfo[] {
    return Array.from(this.sessions.values());
  }

  updateSession(id: string, updates: Partial<TerminalSessionInfo>): void {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, updates);
    }
  }

  removeSession(id: string): void {
    this.sessions.delete(id);
  }

  getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }
}

export const terminalService = new TerminalService();
