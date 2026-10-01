import { AITool, AIToolResult } from './toolTypes';
import { searchService } from '../../services/search/search.service';
import { getWorkspaceRoot } from '../../middleware/security.middleware';
import path from 'path';

export const searchFilesTool: AITool = {
  name: 'search_files',
  description:
    'Search for text across files in the workspace. Use this to locate code before reading or editing it.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Text or regular expression to search for' },
      path: { type: 'string', description: 'Restrict the search to this directory, relative to the workspace' },
      caseSensitive: { type: 'boolean' },
      wholeWord: { type: 'boolean' },
      regex: { type: 'boolean' },
      include: { type: 'string', description: 'Glob of files to include, e.g. **/*.ts' },
      exclude: { type: 'string', description: 'Glob of files to exclude' },
    },
    required: ['query'],
  },
  execute: async (args): Promise<AIToolResult> => {
    // `pattern` is accepted as an alias so a model that reaches for the obvious
    // name still does something useful instead of searching for "undefined".
    const query = (args.query ?? args.pattern) as string | undefined;
    const searchPath = (args.path as string | undefined) ?? '';
    const regex = args.regex as boolean | undefined;
    const caseSensitive = args.caseSensitive as boolean | undefined;
    const wholeWord = args.wholeWord as boolean | undefined;
    const include = args.include as string | undefined;
    const exclude = args.exclude as string | undefined;

    if (typeof query !== 'string' || query.length === 0) {
      return { success: false, error: 'search_files requires a non-empty "query".' };
    }

    try {
      const rootPath = getWorkspaceRoot() || process.cwd();
      const fullSearchPath = searchPath ? path.resolve(rootPath, searchPath) : rootPath;

      const relative = path.relative(rootPath, fullSearchPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return { success: false, error: 'Search path is outside the workspace.' };
      }

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
        changeSummary: `${results.totalMatches} match(es) in ${results.files.length} file(s) for "${query}"`,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Search failed.' };
    }
  },
};
