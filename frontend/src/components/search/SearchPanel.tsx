import React, { useEffect } from 'react';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useSearchStore } from '../../stores/searchStore';
import { searchService } from '../../services/search/searchService';

interface SearchPanelProps {
  workspaceRoot: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ workspaceRoot }) => {
  const { query, options, setResults, setIsSearching, setError } = useSearchStore();

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError(null);

        const results = await searchService.search({
          query: query.trim(),
          workspaceRoot,
          ...options,
        });

        setResults(results);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Search failed');
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query, options, workspaceRoot, setResults, setIsSearching, setError]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <SearchInput />
      <SearchResults />
    </div>
  );
};
