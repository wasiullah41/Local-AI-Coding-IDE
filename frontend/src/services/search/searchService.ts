import { apiService } from '../api/apiService';
import type { SearchRequest, SearchResult } from '@local-ide/shared';

class SearchService {
  async search(request: SearchRequest): Promise<SearchResult> {
    try {
      const response = await apiService.post('/search', {
        query: request.query,
        path: request.workspaceRoot,
        options: {
          caseSensitive: request.caseSensitive ?? false,
          wholeWord: request.wholeWord ?? false,
          regex: request.useRegex ?? false,
          includePattern: request.includePattern,
          excludePattern: request.excludePattern,
          maxResults: request.maxResults ?? 500,
        },
      });

      const data: unknown = response.data.data;

      // The backend returns the shared SearchResult shape directly
      // ({ totalMatches, files, limitReached }). An earlier version reshaped a
      // legacy array of files here and called reduce() on the payload, which
      // threw "reduce is not a function" and broke project-wide search.
      // The shape is validated here so a future mismatch surfaces as a clear
      // message instead of an opaque TypeError inside a React render.
      if (
        typeof data !== 'object' ||
        data === null ||
        !Array.isArray((data as SearchResult).files)
      ) {
        throw new Error('Search returned an unexpected response shape.');
      }

      const result = data as SearchResult;
      return {
        totalMatches: result.totalMatches ?? 0,
        limitReached: result.limitReached ?? false,
        files: result.files,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { code?: string } } };
        if (axiosError.response?.data?.code === 'INVALID_REGEX') {
          throw new Error('Invalid regular expression', { cause: error });
        }
      }
      throw error instanceof Error ? error : new Error('Search failed', { cause: error });
    }
  }
}

export const searchService = new SearchService();
