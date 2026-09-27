import React from 'react';
import { SearchMatch } from '@local-ide/shared';

interface SearchResultItemProps {
  match: SearchMatch;
  filePath: string;
  onClick: () => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  match,
  onClick,
}) => {
  return (
    <div
      className="flex items-start gap-2 px-3 py-1 hover:bg-gray-800 cursor-pointer text-xs group"
      onClick={onClick}
    >
      <span className="text-gray-500 font-mono w-8 text-right flex-shrink-0">
        {match.line}
      </span>
      <span className="text-gray-400 font-mono w-6 text-right flex-shrink-0">
        {match.column}
      </span>
      <span className="text-gray-300 font-mono truncate flex-1 group-hover:text-white">
        {match.lineText}
      </span>
    </div>
  );
};
