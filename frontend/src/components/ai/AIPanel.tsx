import { useState } from 'react';
import { useAIStore } from '../../stores/aiStore';
import { aiApiService } from '../../services/api/aiApiService';
import { ActivityTimeline } from './ActivityTimeline';
import { PermissionDialog } from './PermissionDialog';

export const AIPanel = ({ workspaceRoot }: { workspaceRoot: string }) => {
  const { status, taskId, events, setTaskId, setStatus, cancelTask, resetTask } = useAIStore();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim() || status === 'RUNNING') return;

    const res = await aiApiService.runTask(input, workspaceRoot);
    setTaskId(res.data.data.taskId);
    setStatus('RUNNING');
    setInput('');
  };

  const handleCancel = async () => {
    if (taskId) {
      await aiApiService.cancelTask(taskId);
      cancelTask();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[var(--color-sidebar)] text-[var(--color-text)]">
      <h2 className="text-xl font-bold mb-4">AI Agent</h2>
      <div className="mb-2">Status: <span className="font-mono">{status}</span></div>
      <div className="flex-1 overflow-y-auto mb-4 border border-[var(--color-border)] p-2">
        <ActivityTimeline events={events} />
      </div>
      <div className="flex flex-col gap-2">
        {status === 'RUNNING' && (
          <button onClick={handleCancel} className="bg-red-600 px-4 py-1 text-white text-xs">
            Cancel Task
          </button>
        )}
        {(status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') && (
          <button onClick={resetTask} className="bg-gray-600 px-4 py-1 text-white text-xs">
            Clear
          </button>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === 'RUNNING'}
            className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] p-2 text-xs"
            placeholder="Ask AI to..."
          />
          <button onClick={handleSend} disabled={status === 'RUNNING'} className="bg-[var(--color-accent)] px-4 py-2 text-xs">
            Send
          </button>
        </div>
      </div>
      <PermissionDialog />
    </div>
  );
};
