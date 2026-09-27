import React, { useState } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { SearchResultGroup } from './SearchResultGroup';
import { useEditorStore } from '../../stores/editorStore';

export const SearchResults: React.FC = () => {
  const { results, isSearching, error, query } = useSearchStore();
  const { openFile } = useEditorStore();
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const handleMatchClick = (filePath: string, line: number, column: number) => {
    openFile(filePath, line, column);
  };

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
        Searching...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-4 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
        Enter a search query
      </div>
    );
  }

  if (!results || results.files.length === 0) {
    return (
      <div className="px-3 py-4 text-gray-500 text-sm">
        No results found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
        {results.totalMatches} result{results.totalMatches !== 1 ? 's' : ''} in{' '}
        {results.files.length} file{results.files.length !== 1 ? 's' : ''}
        {results.limitReached && ' (limit reached)'}
      </div>

      <div className="py-2">
        {results.files.map((fileResult) => (
          <SearchResultGroup
            key={fileResult.filePath}
            fileResult={fileResult}
            isExpanded={expandedFiles.has(fileResult.filePath)}
            onToggle={() => toggleFile(fileResult.filePath)}
            onMatchClick={handleMatchClick}
          />
        ))}
      </div>
    </div>
  );
};
