import React, { useEffect, useState } from 'react';
import { gitService } from '../../services/git/gitService';
import { GitStatus } from '@local-ide/shared';

export const SourceControlPanel: React.FC = () => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [message, setMessage] = useState('');

  const refreshStatus = async () => {
    try {
      const s = await gitService.getStatus();
      setStatus(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleStage = async (path: string) => {
    await gitService.stage(path);
    refreshStatus();
  };

  const handleUnstage = async (path: string) => {
    await gitService.unstage(path);
    refreshStatus();
  };

  const handleCommit = async () => {
    if (!message) return;
    await gitService.commit(message);
    setMessage('');
    refreshStatus();
  };

  if (!status?.isRepository) {
    return <div className="p-4 text-gray-500">Not a Git repository.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="font-bold mb-4">Source Control</h2>
      <div className="mb-4">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message"
          className="w-full p-2 bg-gray-800 text-white rounded mb-2"
        />
        <button onClick={handleCommit} className="bg-blue-600 px-4 py-2 rounded text-white">Commit</button>
      </div>
      <div>
        {status.changes.map((change) => (
          <div key={change.path} className="flex justify-between py-1 text-sm">
            <span className={change.staged ? 'text-green-500' : 'text-yellow-500'}>{change.relativePath}</span>
            <button onClick={() => change.staged ? handleUnstage(change.path) : handleStage(change.path)}>
              {change.staged ? 'Unstage' : 'Stage'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
