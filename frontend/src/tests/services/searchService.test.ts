import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above the imports, so the spy has to be hoisted with it.
const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('../../services/api/apiService', () => ({
  apiService: { post, get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { searchService } from '../../services/search/searchService';

const SHARED_RESULT = {
  totalMatches: 5,
  limitReached: false,
  files: [
    {
      filePath: 'C:/ws/src/index.js',
      relativePath: 'src/index.js',
      matches: [
        { line: 1, column: 9, matchLength: 5, lineText: "const { greet } = require('greet');" },
      ],
    },
  ],
};

describe('searchService', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('returns the shared SearchResult the backend already sends', async () => {
    post.mockResolvedValue({ data: { success: true, data: SHARED_RESULT } });

    const result = await searchService.search({ query: 'greet', workspaceRoot: 'C:/ws' });

    // Regression: the service used to treat this object as an array and call
    // reduce() on it, which threw "reduce is not a function" and broke
    // project-wide search in the UI.
    expect(result.files).toHaveLength(1);
    expect(result.totalMatches).toBe(5);
    expect(result.files[0].relativePath).toBe('src/index.js');
    expect(result.files[0].matches[0].matchLength).toBe(5);
    expect(result.files[0].matches[0].lineText).toContain('greet');
  });

  it('sends the query and search options the backend expects', async () => {
    post.mockResolvedValue({ data: { success: true, data: SHARED_RESULT } });

    await searchService.search({
      query: 'greet',
      workspaceRoot: 'C:/ws',
      useRegex: true,
      caseSensitive: true,
      maxResults: 20,
    });

    expect(post).toHaveBeenCalledWith('/search', {
      query: 'greet',
      path: 'C:/ws',
      options: expect.objectContaining({ regex: true, caseSensitive: true, maxResults: 20 }),
    });
  });

  it('defaults maxResults when the caller omits it', async () => {
    post.mockResolvedValue({ data: { success: true, data: SHARED_RESULT } });

    await searchService.search({ query: 'x', workspaceRoot: 'C:/ws' });

    expect(post.mock.calls[0][1].options.maxResults).toBe(500);
  });

  it('reports a malformed payload clearly instead of throwing a TypeError', async () => {
    post.mockResolvedValue({ data: { success: true, data: { unexpected: true } } });

    await expect(searchService.search({ query: 'greet', workspaceRoot: 'C:/ws' })).rejects.toThrow(
      /unexpected response shape/i
    );
  });

  it('translates an invalid-regex rejection into a readable message', async () => {
    post.mockRejectedValue({ response: { data: { code: 'INVALID_REGEX' } } });

    await expect(searchService.search({ query: '(', workspaceRoot: 'C:/ws' })).rejects.toThrow(
      'Invalid regular expression'
    );
  });
});
