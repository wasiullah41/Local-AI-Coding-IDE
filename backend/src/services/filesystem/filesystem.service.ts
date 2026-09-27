import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { IGNORED_DIRS, IGNORED_FILES, MAX_FILE_SIZE, MAX_DIRECTORY_DEPTH, LANGUAGE_MAP } from '../../config/constants';
import { AppError } from '../../middleware/error.middleware';
import { isPathInsideWorkspace, getWorkspaceRoot } from '../../middleware/security.middleware';

export interface FileEntry {
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  extension?: string;
  children?: FileEntry[];
}

export class FilesystemService {
  private async validatePath(targetPath: string): Promise<string> {
    if (!isPathInsideWorkspace(targetPath)) {
      throw new AppError(403, 'ACCESS_DENIED', 'Path is outside workspace boundary');
    }

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      // No workspace open - resolve relative to cwd (legacy behavior for non-workspace mode)
      return path.resolve(targetPath);
    }

    // Resolve relative to workspace root
    const resolvedPath = path.resolve(workspaceRoot, targetPath);

    // Check if the path itself is a symlink first (using lstat)
    try {
      const stats = await fs.lstat(resolvedPath);
      if (stats.isSymbolicLink()) {
        // It's a symlink - check where it points using readlink
        const linkTarget = await fs.readlink(resolvedPath);
        // Resolve the link target relative to the symlink's directory
        const resolvedTarget = path.resolve(path.dirname(resolvedPath), linkTarget);
        const workspaceRealPath = await fs.realpath(workspaceRoot);

        const relative = path.relative(workspaceRealPath, resolvedTarget);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          throw new AppError(403, 'ACCESS_DENIED', 'Path resolves outside workspace boundary (symlink/junction detected)');
        }
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Path doesn't exist yet - check parent directory
        const parentDir = path.dirname(resolvedPath);
        try {
          const parentStats = await fs.lstat(parentDir);
          if (parentStats.isSymbolicLink()) {
            // Parent is a symlink - verify it stays in workspace
            const linkTarget = await fs.readlink(parentDir);
            const resolvedTarget = path.resolve(path.dirname(parentDir), linkTarget);
            const workspaceRealPath = await fs.realpath(workspaceRoot);
            const relative = path.relative(workspaceRealPath, resolvedTarget);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
              throw new AppError(403, 'ACCESS_DENIED', 'Parent directory resolves outside workspace boundary');
            }
          }
        } catch (parentErr: any) {
          if (parentErr.code !== 'ENOENT') throw parentErr;
          // Parent doesn't exist - will be created, proceed
        }
      } else if (err instanceof AppError) {
        throw err;
      }
      // Other errors during check are non-fatal
    }

    return resolvedPath;
  }

  async readDirectory(
    dirPath: string,
    rootPath: string,
    depth: number = 1,
    maxDepth: number = MAX_DIRECTORY_DEPTH
  ): Promise<FileEntry[]> {
    if (depth > maxDepth) return [];

    const resolvedPath = await this.validatePath(dirPath);

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const result: FileEntry[] = [];

      const sorted = entries.sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      for (const entry of sorted) {
        const fullPath = path.join(resolvedPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        if (entry.isDirectory()) {
          if (IGNORED_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
            continue;
          }

          const children = depth < 2
            ? await this.readDirectory(fullPath, rootPath, depth + 1, maxDepth)
            : undefined;

          result.push({
            name: entry.name,
            path: fullPath.replace(/\\/g, '/'),
            relativePath: relativePath.replace(/\\/g, '/'),
            type: 'directory',
            children,
          });
        } else {
          if (IGNORED_FILES.includes(entry.name)) continue;

          const ext = path.extname(entry.name);
          let size: number | undefined;
          let modifiedAt: string | undefined;

          try {
            const stat = await fs.stat(fullPath);
            size = stat.size;
            modifiedAt = stat.mtime.toISOString();
          } catch {
            // Skip stat errors
          }

          result.push({
            name: entry.name,
            path: fullPath.replace(/\\/g, '/'),
            relativePath: relativePath.replace(/\\/g, '/'),
            type: 'file',
            size,
            modifiedAt,
            extension: ext,
          });
        }
      }

      return result;
    } catch (err: any) {
      throw new AppError(500, 'FS_READ_ERROR', `Failed to read directory: ${err.message}`);
    }
  }

  async readFile(filePath: string): Promise<{
    content: string;
    language: string;
    size: number;
    modifiedAt: string;
  }> {
    const resolvedPath = await this.validatePath(filePath);

    try {
      const stat = await fs.stat(resolvedPath);

      if (stat.size > MAX_FILE_SIZE) {
        throw new AppError(413, 'FILE_TOO_LARGE', 'File exceeds maximum size limit');
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const ext = path.extname(resolvedPath).toLowerCase();
      const language = LANGUAGE_MAP[ext] || 'plaintext';

      return {
        content,
        language,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.code === 'ENOENT') {
        throw new AppError(404, 'FILE_NOT_FOUND', 'File not found');
      }
      throw new AppError(500, 'FS_READ_ERROR', `Failed to read file: ${err.message}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolvedPath = await this.validatePath(filePath);

    try {
      const dir = path.dirname(resolvedPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(resolvedPath, content, 'utf-8');
    } catch (err: any) {
      throw new AppError(500, 'FS_WRITE_ERROR', `Failed to write file: ${err.message}`);
    }
  }

  async createFile(filePath: string, content: string = ''): Promise<void> {
    const resolvedPath = await this.validatePath(filePath);

    try {
      const exists = fsSync.existsSync(resolvedPath);
      if (exists) {
        throw new AppError(409, 'FILE_EXISTS', 'File already exists');
      }

      const dir = path.dirname(resolvedPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(resolvedPath, content, 'utf-8');
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, 'FS_CREATE_ERROR', `Failed to create file: ${err.message}`);
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(await this.validatePath(dirPath), { recursive: true });
    } catch (err: any) {
      throw new AppError(500, 'FS_CREATE_ERROR', `Failed to create directory: ${err.message}`);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.rename(await this.validatePath(oldPath), await this.validatePath(newPath));
    } catch (err: any) {
      throw new AppError(500, 'FS_RENAME_ERROR', `Failed to rename: ${err.message}`);
    }
  }

  async delete(targetPath: string): Promise<void> {
    const resolvedPath = await this.validatePath(targetPath);

    try {
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
        await fs.rm(resolvedPath, { recursive: true, force: true });
      } else {
        await fs.unlink(resolvedPath);
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') return; // Already deleted
      throw new AppError(500, 'FS_DELETE_ERROR', `Failed to delete: ${err.message}`);
    }
  }

  async exists(targetPath: string): Promise<boolean> {
    try {
      const resolved = await this.validatePath(targetPath);
      await fs.access(resolved);
      return true;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      return false;
    }
  }

  async getStats(targetPath: string): Promise<{
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    createdAt: string;
    modifiedAt: string;
  }> {
    try {
      const stat = await fs.stat(await this.validatePath(targetPath));
      return {
        size: stat.size,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch (err: any) {
      throw new AppError(404, 'NOT_FOUND', `Path not found: ${err.message}`);
    }
  }

  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return LANGUAGE_MAP[ext] || 'plaintext';
  }
}

export const filesystemService = new FilesystemService();
