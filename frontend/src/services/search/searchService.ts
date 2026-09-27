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

      const results = response.data.data || [];

      // Transform backend format to shared type format
      interface BackendMatch {
        line: number;
        column: number;
        length: number;
        lineContent: string;
      }
      interface BackendFile {
        file: string;
        relativePath: string;
        matches: BackendMatch[];
      }

      const typedResults = results as BackendFile[];
      const totalMatches = typedResults.reduce((sum: number, file: BackendFile) => sum + file.matches.length, 0);
      const limitReached = totalMatches >= (request.maxResults ?? 500);

      return {
        totalMatches,
        limitReached,
        files: typedResults.map((file: BackendFile) => ({
          filePath: file.file,
          relativePath: file.relativePath,
          matches: file.matches.map((match: BackendMatch) => ({
            line: match.line,
            column: match.column,
            matchLength: match.length,
            lineText: match.lineContent,
          })),
        })),
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
