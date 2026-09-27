import fs from 'fs/promises';
import path from 'path';
import { IGNORED_DIRS, MAX_SEARCH_RESULTS } from '../../config/constants';
import { SearchOptions, SearchResult, SearchFileResult, SearchMatch } from '@local-ide/shared';

export class SearchService {
  async search(
    rootPath: string,
    query: string,
    options: SearchOptions = { useRegex: false, caseSensitive: false, wholeWord: false }
  ): Promise<SearchResult> {
    const results: SearchFileResult[] = [];
    const maxResults = options.maxResults || MAX_SEARCH_RESULTS;
    let totalMatches = 0;

    const pattern = this.buildPattern(query, options);
    if (!pattern) return { totalMatches: 0, files: [], limitReached: false };

    await this.searchDirectory(rootPath, rootPath, pattern, options, results, maxResults, { count: totalMatches });

    return {
      totalMatches: results.reduce((acc, file) => acc + file.matches.length, 0),
      files: results,
      limitReached: totalMatches >= maxResults
    };
  }

  private buildPattern(query: string, options: SearchOptions): RegExp | null {
    try {
      let pattern = query;

      if (!options.useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = options.caseSensitive ? 'g' : 'gi';
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }

  private async searchDirectory(
    dirPath: string,
    rootPath: string,
    pattern: RegExp,
    options: SearchOptions,
    results: SearchFileResult[],
    maxResults: number,
    counter: { count: number }
  ): Promise<void> {
    if (counter.count >= maxResults) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (counter.count >= maxResults) return;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (IGNORED_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          await this.searchDirectory(fullPath, rootPath, pattern, options, results, maxResults, counter);
        } else if (entry.isFile()) {
          if (!this.shouldIncludeFile(entry.name, fullPath, options)) continue;

          const matches = await this.searchFile(fullPath, pattern);
          if (matches.length > 0) {
            results.push({
              filePath: fullPath.replace(/\\/g, '/'),
              relativePath: path.relative(rootPath, fullPath).replace(/\\/g, '/'),
              matches,
            });
            counter.count += matches.length;
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  private shouldIncludeFile(name: string, fullPath: string, options: SearchOptions): boolean {
    const binaryExts = ['.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o',
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
      '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.sqlite', '.db'];

    const ext = path.extname(name).toLowerCase();
    if (binaryExts.includes(ext)) return false;

    if (options.includePattern) {
      const includeRegex = this.globToRegex(options.includePattern);
      if (!includeRegex.test(name)) return false;
    }

    if (options.excludePattern) {
      const excludeRegex = this.globToRegex(options.excludePattern);
      if (excludeRegex.test(name)) return false;
    }

    return true;
  }

  private globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(escaped, 'i');
  }

  private async searchFile(filePath: string, pattern: RegExp): Promise<SearchMatch[]> {
    const matches: SearchMatch[] = [];

    try {
      const stat = await fs.stat(filePath);
      if (stat.size > 1024 * 1024) return matches;

      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        pattern.lastIndex = 0;
        let match;

        while ((match = pattern.exec(line)) !== null) {
          matches.push({
            line: i + 1,
            column: match.index + 1,
            matchLength: match[0].length,
            lineText: line.trimEnd(),
          });

          if (!pattern.global) break;
        }
      }
    } catch {
      // Skip files we can't read
    }

    return matches;
  }
}

export const searchService = new SearchService();
