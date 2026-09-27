import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { terminalClient } from '../../services/terminal/terminalService';

export const TerminalPanel: React.FC<{ cwd: string }> = ({ cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal>(new Terminal({ theme: { background: '#111827' } }));
  const fitAddon = useRef(new FitAddon());
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const xterm = xtermRef.current;
    xterm.loadAddon(fitAddon.current);
    if (terminalRef.current) {
        xterm.open(terminalRef.current);
    }

    // Set up creation callback
    terminalClient.setOnCreate((session) => {
        sessionIdRef.current = session.sessionId;
    });

    // Create new terminal session
    terminalClient.createTerminal('New Terminal', cwd);

    terminalClient.setOnData((id, data) => {
        if (id === sessionIdRef.current) {
            xterm.write(data);
        }
    });

    xterm.onData(data => {
        if (sessionIdRef.current) {
            terminalClient.sendInput(sessionIdRef.current, data);
        }
    });

    fitAddon.current.fit();

    return () => {
        xterm.dispose();
    };
  }, [cwd]);

  return <div ref={terminalRef} className="h-full w-full" />;
};
