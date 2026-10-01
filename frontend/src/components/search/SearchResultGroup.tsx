import React from 'react';
import { ChevronRight, ChevronDown, FileCode2 } from 'lucide-react';
import type { SearchFileResult } from '@local-ide/shared';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultGroupProps {
  fileResult: SearchFileResult;
  isExpanded: boolean;
  onToggle: () => void;
  onMatchClick: (filePath: string, line: number, column: number) => void;
}

export const SearchResultGroup: React.FC<SearchResultGroupProps> = ({
  fileResult,
  isExpanded,
  onToggle,
  onMatchClick,
}) => (
  <div>
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onToggle();
      }}
      className="flex items-center gap-1.5 h-[22px] px-2 cursor-pointer"
      style={{ color: 'var(--color-text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      <FileCode2 size={13} style={{ color: 'var(--color-accent)' }} />
      <span className="text-[12px] truncate flex-1" title={fileResult.relativePath}>
        {fileResult.relativePath}
      </span>
      <span
        className="text-[10px] px-1 rounded shrink-0"
        style={{ background: 'var(--color-elevated)', color: 'var(--color-text-muted)' }}
      >
        {fileResult.matches.length}
      </span>
    </div>

    {isExpanded && (
      <div role="group">
        {fileResult.matches.map((match, index) => (
          <SearchResultItem
            key={`${match.line}-${match.column}-${index}`}
            match={match}
            filePath={fileResult.filePath}
            onClick={() => onMatchClick(fileResult.filePath, match.line, match.column)}
          />
        ))}
      </div>
    )}
  </div>
);

export default SearchResultGroup;
