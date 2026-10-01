import React from 'react';
import type { SearchMatch } from '@local-ide/shared';

interface SearchResultItemProps {
  match: SearchMatch;
  filePath: string;
  onClick: () => void;
}

/** Renders `lineText` with the matched range highlighted. */
const Highlighted: React.FC<{ text: string; column: number }> = ({ text, column }) => {
  const index = Math.max(0, column - 1);
  if (index >= text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark
        className="rounded-sm px-px"
        style={{ background: 'var(--color-accent-soft)', color: 'var(--color-text-strong)' }}
      >
        {text.slice(index, index + 12) || ' '}
      </mark>
      {text.slice(index + 12)}
    </>
  );
};

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ match, onClick }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === 'Enter') onClick();
    }}
    className="flex items-start gap-2 pl-7 pr-2 py-[3px] cursor-pointer"
    style={{ color: 'var(--color-text)' }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    <span
      className="text-[11px] font-mono w-6 text-right shrink-0"
      style={{ color: 'var(--color-text-subtle)' }}
    >
      {match.line}
    </span>
    <span
      className="text-[11px] font-mono truncate flex-1"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <Highlighted text={match.lineText} column={match.column} />
    </span>
  </div>
);

export default SearchResultItem;
