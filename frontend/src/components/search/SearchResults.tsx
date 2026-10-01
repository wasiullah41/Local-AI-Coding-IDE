import React, { useState } from 'react';
import { Loader2, SearchX } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { SearchResultGroup } from './SearchResultGroup';
import { useEditorStore } from '../../stores/editorStore';

export const SearchResults: React.FC = () => {
  const { results, isSearching, error, query } = useSearchStore();
  const { openFile } = useEditorStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (isSearching) {
    return (
      <div className="flex items-center gap-2 p-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        <Loader2 size={13} className="anim-spin" />
        Searching…
      </div>
    );
  }

  if (error) {
    return (
      <p className="p-3 text-[12px]" style={{ color: 'var(--color-danger)' }}>
        {error}
      </p>
    );
  }

  if (!query.trim()) {
    return (
      <p className="p-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
        Type something to search across the workspace.
      </p>
    );
  }

  if (!results || results.files.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 text-[12px]" style={{ color: 'var(--color-text-subtle)' }}>
        <SearchX size={13} />
        No results for “{query}”
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto ide-scroll">
      {results.files.map((fileResult) => (
        <SearchResultGroup
          key={fileResult.filePath}
          fileResult={fileResult}
          // Open by default; the user can collapse individual files.
          isExpanded={!collapsed[fileResult.filePath]}
          onToggle={() =>
            setCollapsed((prev) => ({
              ...prev,
              [fileResult.filePath]: !prev[fileResult.filePath],
            }))
          }
          onMatchClick={(filePath, line, column) => {
            // Reveal the file in the editor at the match, then jump to it.
            void openFile(filePath, line, column);
          }}
        />
      ))}
    </div>
  );
};

export default SearchResults;
