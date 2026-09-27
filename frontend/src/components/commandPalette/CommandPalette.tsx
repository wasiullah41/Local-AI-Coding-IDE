import React, { useState, useEffect } from 'react';
import { useCommandStore } from '../../stores/commandStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose }) => {
  const { commands, executeCommand } = useCommandStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredCommands = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--color-sidebar)] w-full max-w-lg rounded shadow-lg p-2" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          placeholder="Type a command..."
          className="w-full bg-[var(--color-background)] text-[var(--color-text)] p-2 mb-2 rounded"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto">
          {filteredCommands.map(cmd => (
            <div
              key={cmd.id}
              className="p-2 cursor-pointer hover:bg-[var(--color-accent)] rounded text-sm"
              onClick={() => { executeCommand(cmd.id); onClose(); }}
            >
              {cmd.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
