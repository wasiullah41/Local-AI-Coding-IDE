import { AgentEvent } from '@local-ide/shared';

export const ActivityTimeline = ({ events }: { events: AgentEvent[] }) => {
  return (
    <div className="flex flex-col gap-2 p-2">
      {events.map((event, i) => (
        <div key={i} className="text-xs border-b border-[var(--color-border)] py-1">
          <span className="font-bold text-[var(--color-accent)]">{event.type}</span>:
          <span> {JSON.stringify(event.payload)}</span>
        </div>
      ))}
    </div>
  );
};
