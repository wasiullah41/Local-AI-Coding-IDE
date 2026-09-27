import { create } from 'zustand';
import type { SearchResult, SearchOptions } from '@local-ide/shared';

interface SearchState {
  query: string;
  results: SearchResult | null;
  isSearching: boolean;
  error: string | null;
  options: SearchOptions;

  setQuery: (query: string) => void;
  setResults: (results: SearchResult | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setError: (error: string | null) => void;
  setOptions: (options: Partial<SearchOptions>) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: null,
  isSearching: false,
  error: null,
  options: {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    excludePattern: '',
    maxResults: 500,
  },

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results, isSearching: false, error: null }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setError: (error) => set({ error, isSearching: false }),
  setOptions: (newOptions) =>
    set((state) => ({ options: { ...state.options, ...newOptions } })),
  clearSearch: () =>
    set({ query: '', results: null, isSearching: false, error: null }),
}));
