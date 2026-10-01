import path from 'path';
import { validateWorkspaceBoundary, setWorkspaceRoot, isPathInsideWorkspace } from '../src/middleware/security.middleware';
import { filesystemService } from '../src/services/filesystem/filesystem.service';
import { AppError } from '../src/middleware/error.middleware';

const WORKSPACE = path.resolve('D:/Local AI Coding IDE/qa_boundary_status_workspace');
const OUTSIDE = path.resolve('C:/Windows/Temp/qa_boundary_escape.txt');

function fakeReq(body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  return { body, query } as any;
}

function capture(err?: any): { status?: number; code?: string } {
  if (!err) return {};
  return { status: err.statusCode, code: err.code };
}

describe('workspace boundary status codes', () => {
  beforeAll(async () => {
    setWorkspaceRoot(WORKSPACE);
    await filesystemService.createDirectory(WORKSPACE);
    await filesystemService.writeFile(path.join(WORKSPACE, 'inside.txt'), 'inside');
  });

  afterAll(async () => {
    await filesystemService.delete(WORKSPACE);
  });

  describe('isPathInsideWorkspace', () => {
    it('rejects an absolute path outside the workspace', () => {
      expect(isPathInsideWorkspace(OUTSIDE)).toBe(false);
    });

    it('rejects a relative traversal outside the workspace', () => {
      expect(isPathInsideWorkspace('../../../../Windows/Temp/qa.txt')).toBe(false);
    });

    it('accepts a relative path inside the workspace', () => {
      expect(isPathInsideWorkspace('inside.txt')).toBe(true);
    });
  });

  describe('validateWorkspaceBoundary checks every supplied path', () => {
    it('rejects when only oldPath is outside', () => {
      let err: any;
      validateWorkspaceBoundary(fakeReq({ oldPath: OUTSIDE, newPath: 'moved.txt' }), {} as any, (e?: any) => { err = e; });
      expect(capture(err).status).toBe(403);
      expect(capture(err).code).toBe('ACCESS_DENIED');
    });

    it('rejects when only newPath is outside', () => {
      let err: any;
      validateWorkspaceBoundary(fakeReq({ oldPath: 'inside.txt', newPath: OUTSIDE }), {} as any, (e?: any) => { err = e; });
      expect(capture(err).status).toBe(403);
      expect(capture(err).code).toBe('ACCESS_DENIED');
    });

    it('rejects a rename whose newPath escapes via relative traversal', () => {
      let err: any;
      validateWorkspaceBoundary(fakeReq({ oldPath: 'inside.txt', newPath: '../../../../Windows/Temp/x.txt' }), {} as any, (e?: any) => { err = e; });
      expect(capture(err).status).toBe(403);
    });

    it('allows a rename fully inside the workspace', () => {
      let err: any;
      validateWorkspaceBoundary(fakeReq({ oldPath: 'inside.txt', newPath: 'moved.txt' }), {} as any, (e?: any) => { err = e; });
      expect(err).toBeUndefined();
    });

    it('rejects an outside path supplied via query', () => {
      let err: any;
      validateWorkspaceBoundary(fakeReq({}, { path: OUTSIDE }), {} as any, (e?: any) => { err = e; });
      expect(capture(err).status).toBe(403);
    });

    it('allows an in-workspace path supplied via query', () => {
      let err: any;
      validateWorkspaceBoundary(fakeReq({}, { path: 'inside.txt' }), {} as any, (e?: any) => { err = e; });
      expect(err).toBeUndefined();
    });
  });

  describe('service errors preserve their status instead of becoming 500', () => {
    async function captureFailure(run: () => Promise<unknown>): Promise<any> {
      return run().then(() => null).catch((e: any) => e);
    }

    it('rename to an outside newPath surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.rename('inside.txt', OUTSIDE));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('ACCESS_DENIED');
    });

    it('writeFile to an outside path surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.writeFile(OUTSIDE, 'escape'));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('createFile to an outside path surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.createFile(OUTSIDE, 'escape'));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('createDirectory to an outside path surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.createDirectory(path.dirname(OUTSIDE)));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('getStats on an outside path surfaces 403, not 404', async () => {
      const err = await captureFailure(() => filesystemService.getStats(OUTSIDE));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('readFile on an outside path surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.readFile(OUTSIDE));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('delete of an outside path surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.delete(OUTSIDE));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('exists() on an outside path surfaces 403 rather than false', async () => {
      const err = await captureFailure(() => filesystemService.exists(OUTSIDE));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('readDirectory on an outside path surfaces 403, not 500', async () => {
      const err = await captureFailure(() => filesystemService.readDirectory(path.dirname(OUTSIDE), WORKSPACE));
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
    });

    it('never wrote to the outside target', () => {
      expect(require('fs').existsSync(OUTSIDE)).toBe(false);
    });
  });
});
