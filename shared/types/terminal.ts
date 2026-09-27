export interface TerminalSession {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  pid?: number;
  status: 'running' | 'exited';
  exitCode?: number;
  createdAt: string;
}

export interface TerminalInput {
  sessionId: string;
  data: string;
}

export interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: string;
}

export interface TerminalResize {
  sessionId: string;
  cols: number;
  rows: number;
}

export type TerminalShellType = 'powershell' | 'cmd' | 'bash' | 'wsl';
