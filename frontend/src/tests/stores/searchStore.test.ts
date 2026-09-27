import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '../../stores/searchStore';

describe('SearchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSearchStore.setState({
      query: '',
      results: null,
      isSearching: false,
      error: null,
      options: {
        caseSensitive: false,
        wholeWord: false,
        useRegex: false,
        includePattern: '',
        excludePattern: '',
        maxResults: 500,
      },
    });
  });

  it('should initialize with default state', () => {
    const state = useSearchStore.getState();
    expect(state.query).toBe('');
    expect(state.results).toBeNull();
    expect(state.isSearching).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should update query', () => {
    const { setQuery } = useSearchStore.getState();
    setQuery('test search');

    const state = useSearchStore.getState();
    expect(state.query).toBe('test search');
  });

  it('should update search options', () => {
    const { setOptions } = useSearchStore.getState();
    setOptions({ caseSensitive: true });

    const state = useSearchStore.getState();
    expect(state.options.caseSensitive).toBe(true);
  });

  it('should set search results', () => {
    const { setResults } = useSearchStore.getState();
    const mockResults = {
      totalMatches: 5,
      limitReached: false,
      files: [],
    };
    setResults(mockResults);

    const state = useSearchStore.getState();
    expect(state.results).toEqual(mockResults);
  });

  it('should set error', () => {
    const { setError } = useSearchStore.getState();
    setError('Search failed');

    const state = useSearchStore.getState();
    expect(state.error).toBe('Search failed');
  });

  it('should set searching state', () => {
    const { setIsSearching } = useSearchStore.getState();
    setIsSearching(true);

    const state = useSearchStore.getState();
    expect(state.isSearching).toBe(true);
  });
});
