import React, { useEffect } from 'react';
import { Search } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <Search className="h-4 w-4 text-gray-500" />
        <span className="text-xs font-bold text-gray-500">SEARCH</span>
      </div>

      <SearchInput />
      <SearchResults />
    </div>
  );
};
