import { useAIStore } from '../../stores/aiStore';

export const PermissionDialog = () => {
  const { status, setStatus } = useAIStore();

  if (status !== 'WAITING_PERMISSION') return null;

  const handleResolve = async (_allowed: boolean) => {
    setStatus('RUNNING');
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-[var(--color-sidebar)] p-4 rounded text-white border border-[var(--color-border)]">
        <h3 className="font-bold mb-2">Permission Required</h3>
        <p className="mb-4">The agent wants to perform a protected action.</p>
        <div className="flex gap-2">
            <button onClick={() => handleResolve(false)} className="bg-red-500 px-4 py-2">Deny</button>
            <button onClick={() => handleResolve(true)} className="bg-green-500 px-4 py-2">Allow</button>
        </div>
      </div>
    </div>
  );
};
