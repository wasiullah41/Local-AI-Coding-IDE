import React from 'react';
import { SearchFileResult } from '@local-ide/shared';
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
}) => {
  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 cursor-pointer text-sm"
        onClick={onToggle}
      >
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
        <span className="text-blue-400 truncate flex-1" title={fileResult.relativePath}>
          {fileResult.relativePath}
        </span>
        <span className="text-gray-500 text-xs">{fileResult.matches.length}</span>
      </div>

      {isExpanded && (
        <div className="pl-8">
          {fileResult.matches.map((match, idx) => (
            <SearchResultItem
              key={`${match.line}-${match.column}-${idx}`}
              match={match}
              filePath={fileResult.filePath}
              onClick={() => onMatchClick(fileResult.filePath, match.line, match.column)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
