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
  /**
   * `fs.realpath` throws when the path does not exist yet, which happens when a
   * workspace root is registered before the directory is created. Falling back
   * to the lexically resolved path keeps that flow working; an existing
   * workspace always resolves for real, so the boundary check still holds.
   */
  private async realpathOrSelf(target: string): Promise<string> {
    try {
      return await fs.realpath(target);
    } catch (err: any) {
      if (err.code === 'ENOENT') return path.resolve(target);
      throw err;
    }
  }

  /**
   * Confirms the target really lives inside the workspace.
   *
   * A lexical check is not enough on Windows: a symlink or directory junction
   * (created with `mklink /J`, which needs no elevation) can sit anywhere along
   * the path and redirect access outside the workspace. Checking only the final
   * component left `<workspace>/link/secret.txt` readable, because the leaf is
   * an ordinary file and the junction is an ancestor. So every component below
   * the root is inspected, and a link is resolved by hand because `realpath`
   * fails when a link points at a file that does not exist yet.
   */
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
    const workspaceRealPath = FilesystemService.stripExtendedPrefix(
      await this.realpathOrSelf(workspaceRoot)
    );

    const segments = path.relative(path.resolve(workspaceRoot), resolvedPath).split(path.sep);
    let current = path.resolve(workspaceRoot);

    for (const segment of segments) {
      if (!segment) continue;
      current = path.join(current, segment);

      let stats;
      try {
        stats = await fs.lstat(current);
      } catch (err: any) {
        // The rest of the path does not exist yet, so there is no link left to
        // inspect. Creating it later cannot escape the workspace.
        if (err.code === 'ENOENT') return resolvedPath;
        throw err;
      }

      if (!stats.isSymbolicLink()) continue;

      // Follow the link manually: realpath() would throw when the target has
      // not been created yet, which is exactly the write-through case.
      const linkTarget = await fs.readlink(current);
      const absoluteTarget = path.resolve(path.dirname(current), linkTarget);
      const realParent = FilesystemService.stripExtendedPrefix(
        await this.realpathOrSelf(path.dirname(absoluteTarget))
      );
      const resolvedTarget = path.join(realParent, path.basename(absoluteTarget));

      const relative = path.relative(workspaceRealPath, resolvedTarget);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new AppError(
          403,
          'ACCESS_DENIED',
          'Path resolves outside workspace boundary (symlink/junction detected)'
        );
      }

      // The link stays inside the workspace, so keep checking what lies below it.
      current = realParent;
    }

    return resolvedPath;
  }

  /** Windows junctions report their target as `\\?\C:\...`; drop that prefix. */
  private static stripExtendedPrefix(target: string): string {
    return target.replace(/^\\\\\?\\/, '');
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
        if (err instanceof AppError) throw err;
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
      if (err instanceof AppError) throw err;
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
      if (err instanceof AppError) throw err;
      throw new AppError(500, 'FS_CREATE_ERROR', `Failed to create directory: ${err.message}`);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.rename(await this.validatePath(oldPath), await this.validatePath(newPath));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
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
      if (err instanceof AppError) throw err;
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
      if (err instanceof AppError) throw err;
      throw new AppError(404, 'NOT_FOUND', `Path not found: ${err.message}`);
    }
  }

  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return LANGUAGE_MAP[ext] || 'plaintext';
  }
}

export const filesystemService = new FilesystemService();
