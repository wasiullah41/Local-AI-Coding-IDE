import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search/search.service';
import { getWorkspaceRoot } from '../middleware/security.middleware';
import { AppError } from '../middleware/error.middleware';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, path: searchPath, options } = req.body;
      const workspace = getWorkspaceRoot();

      const rootPath = searchPath || workspace;
      if (!rootPath) {
        throw new AppError(400, 'NO_WORKSPACE', 'No workspace is open');
      }

      if (!query) {
        throw new AppError(400, 'MISSING_QUERY', 'Search query is required');
      }

      const results = await searchService.search(rootPath, query, options);
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
