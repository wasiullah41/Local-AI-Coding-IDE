import { AITool, AIToolResult } from './toolTypes';
import { searchService } from '../../services/search/search.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';

export const searchFilesTool: AITool = {
  name: 'search_files',
  description: 'Search for text in files within the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      path: { type: 'string', description: 'Relative path to search within' },
      caseSensitive: { type: 'boolean' },
      wholeWord: { type: 'boolean' },
      regex: { type: 'boolean' },
      include: { type: 'string' },
      exclude: { type: 'string' },
    },
    required: ['query'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const {
      query,
      path: searchPath = '',
      caseSensitive,
      wholeWord,
      regex,
      include,
      exclude
    } = args as any;

    try {
      const rootPath = getWorkspaceRoot() || '';
      const fullSearchPath = searchPath ? require('path').join(rootPath, searchPath) : rootPath;

      const results = await searchService.search(fullSearchPath, query, {
        useRegex: regex,
        caseSensitive,
        wholeWord,
        includePattern: include,
        excludePattern: exclude,
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
    }
  },
};
