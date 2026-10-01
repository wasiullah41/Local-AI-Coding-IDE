import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { searchService } from '../services/search/search.service';
import { getWorkspaceRoot } from '../middleware/security.middleware';
import { AppError } from '../middleware/error.middleware';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, path: searchPath, options } = req.body as {
        query?: string;
        path?: string;
        options?: Record<string, unknown>;
      };

      const workspace = getWorkspaceRoot();
      if (!workspace) {
        throw new AppError(400, 'NO_WORKSPACE', 'Open a folder before searching.');
      }

      if (!query || typeof query !== 'string' || query.length === 0) {
        throw new AppError(400, 'MISSING_QUERY', 'Enter something to search for.');
      }

      // A caller-supplied path may narrow the search, but it can never widen
      // it: it is resolved against the open workspace and rejected if it lands
      // outside. Search is read access, so this is the same boundary every
      // other read path enforces.
      let rootPath = workspace;
      if (searchPath) {
        const candidate = path.isAbsolute(searchPath)
          ? path.resolve(searchPath)
          : path.resolve(workspace, searchPath);
        const relative = path.relative(workspace, candidate);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          throw new AppError(403, 'ACCESS_DENIED', 'Search path is outside the workspace.');
        }
        rootPath = candidate;
      }

      const results = await searchService.search(rootPath, query, options ?? {});
      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
