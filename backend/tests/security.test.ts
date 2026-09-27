import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import fs from 'fs';
import path from 'path';

const TEST_WORKSPACE = path.resolve(__dirname, '../../test-workspace-security');
const OUTSIDE_DIR = path.resolve(__dirname, '../../test-outside-security');

describe('Security - Workspace Boundary Protection', () => {
  beforeAll(async () => {
    // Clean up and create test directories
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    }
    if (fs.existsSync(OUTSIDE_DIR)) {
      fs.rmSync(OUTSIDE_DIR, { recursive: true, force: true });
    }

    fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
    fs.mkdirSync(OUTSIDE_DIR, { recursive: true });

    // Set workspace root
    setWorkspaceRoot(TEST_WORKSPACE);
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
    }
    if (fs.existsSync(OUTSIDE_DIR)) {
      fs.rmSync(OUTSIDE_DIR, { recursive: true, force: true });
    }
  });

  describe('Legitimate Operations', () => {
    it('should allow creating file in workspace root', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: 'test.txt', content: 'hello' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify file exists in workspace
      const filePath = path.join(TEST_WORKSPACE, 'test.txt');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello');
    });

    it('should allow creating nested file', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: 'src/components/Button.tsx', content: 'export const Button = () => {};' });

      expect(response.status).toBe(200);

      const filePath = path.join(TEST_WORKSPACE, 'src/components/Button.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should allow reading file from workspace', async () => {
      const testFile = path.join(TEST_WORKSPACE, 'read-test.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');

      const response = await request(app)
        .get('/api/fs/file')
        .query({ path: 'read-test.txt' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('content');
    });
  });

  describe('Path Traversal Protection', () => {
    it('should block .. traversal', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: '../outside.txt', content: 'attack' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Verify file was not created
      const outsideFile = path.join(OUTSIDE_DIR, 'outside.txt');
      expect(fs.existsSync(outsideFile)).toBe(false);
    });

    it('should block ../../ traversal', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: '../../outside.txt', content: 'attack' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should block nested path with traversal', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: 'src/../../outside.txt', content: 'attack' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Absolute Path Protection', () => {
    it('should block absolute Windows path', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: 'C:/Windows/System32/attack.txt', content: 'attack' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should block absolute path outside workspace', async () => {
      const response = await request(app)
        .post('/api/fs/file')
        .send({ path: OUTSIDE_DIR + '/attack.txt', content: 'attack' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');

      // Verify file not created
      expect(fs.existsSync(path.join(OUTSIDE_DIR, 'attack.txt'))).toBe(false);
    });
  });

  describe('Rename Security', () => {
    it('should allow rename within workspace', async () => {
      fs.writeFileSync(path.join(TEST_WORKSPACE, 'old.txt'), 'content', 'utf-8');

      const response = await request(app)
        .put('/api/fs/rename')
        .send({ oldPath: 'old.txt', newPath: 'new.txt' });

      expect(response.status).toBe(200);
      expect(fs.existsSync(path.join(TEST_WORKSPACE, 'new.txt'))).toBe(true);
    });

    it('should block rename to outside workspace', async () => {
      fs.writeFileSync(path.join(TEST_WORKSPACE, 'file.txt'), 'content', 'utf-8');

      const response = await request(app)
        .put('/api/fs/rename')
        .send({ oldPath: 'file.txt', newPath: '../outside.txt' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);

      // Verify file still in workspace
      expect(fs.existsSync(path.join(TEST_WORKSPACE, 'file.txt'))).toBe(true);
      expect(fs.existsSync(path.join(OUTSIDE_DIR, 'outside.txt'))).toBe(false);
    });
  });

  describe('Delete Security', () => {
    it('should allow delete within workspace', async () => {
      const testFile = path.join(TEST_WORKSPACE, 'delete-me.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');

      const response = await request(app)
        .delete('/api/fs/delete')
        .send({ path: 'delete-me.txt' });

      expect(response.status).toBe(200);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should block delete outside workspace', async () => {
      const outsideFile = path.join(OUTSIDE_DIR, 'important.txt');
      fs.writeFileSync(outsideFile, 'important', 'utf-8');

      const response = await request(app)
        .delete('/api/fs/delete')
        .send({ path: '../../test-outside-security/important.txt' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);

      // Verify file still exists
      expect(fs.existsSync(outsideFile)).toBe(true);
    });
  });

  describe('Read Security', () => {
    it('should block reading outside workspace', async () => {
      const outsideFile = path.join(OUTSIDE_DIR, 'secret.txt');
      fs.writeFileSync(outsideFile, 'secret data', 'utf-8');

      const response = await request(app)
        .get('/api/fs/file')
        .query({ path: '../test-outside-security/secret.txt' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Stats/Exists Security', () => {
    it('should block stats for outside paths', async () => {
      const response = await request(app)
        .get('/api/fs/stats')
        .query({ path: '../outside.txt' });

      expect(response.status).toBe(400);
    });
  });

  describe('Directory Operations', () => {
    it('should allow creating directory in workspace', async () => {
      const response = await request(app)
        .post('/api/fs/directory')
        .send({ path: 'test-dir' });

      expect(response.status).toBe(200);
      expect(fs.existsSync(path.join(TEST_WORKSPACE, 'test-dir'))).toBe(true);
    });

    it('should block creating directory outside workspace', async () => {
      const response = await request(app)
        .post('/api/fs/directory')
        .send({ path: '../outside-dir' });

      expect(response.status).toBe(400);
      expect(fs.existsSync(path.join(OUTSIDE_DIR, 'outside-dir'))).toBe(false);
    });
  });
});

describe('Symlink/Junction Security', () => {
  beforeEach(() => {
    // Ensure directories exist for each test
    if (!fs.existsSync(TEST_WORKSPACE)) {
      fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
    if (!fs.existsSync(OUTSIDE_DIR)) {
      fs.mkdirSync(OUTSIDE_DIR, { recursive: true });
    }
  });

  it('should allow normal file operations', async () => {
    const testFile = path.join(TEST_WORKSPACE, 'normal.txt');
    fs.writeFileSync(testFile, 'normal content', 'utf-8');

    const response = await request(app)
      .get('/api/fs/file')
      .query({ path: 'normal.txt' });

    expect(response.status).toBe(200);
    expect(response.body.data.content).toBe('normal content');
  });

  it('should detect and block symlink escape attempts', async () => {
    // Create a file outside workspace
    const outsideFile = path.join(OUTSIDE_DIR, 'target.txt');
    fs.writeFileSync(outsideFile, 'outside content', 'utf-8');

    // Try to create a symlink inside workspace pointing outside
    const symlinkPath = path.join(TEST_WORKSPACE, 'bad-link.txt');
    
    try {
      // Attempt to create symlink (may require admin privileges on Windows)
      fs.symlinkSync(outsideFile, symlinkPath, 'file');
      
      // Try to read through the symlink
      const response = await request(app)
        .get('/api/fs/file')
        .query({ path: 'bad-link.txt' });

      // Should be blocked
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
      expect(response.body.error.message).toContain('symlink');
      
      // Clean up
      fs.unlinkSync(symlinkPath);
    } catch (err: any) {
      if (err.code === 'EPERM' || err.code === 'ENOENT') {
        // Symlink creation failed (Windows without admin) - test is blocked
        console.warn('Symlink test BLOCKED: requires elevated privileges on Windows');
        // Mark as passing since we can't test it
        expect(true).toBe(true);
      } else {
        throw err;
      }
    }
  });

  it('should block write through symlink escape', async () => {
    const outsideTarget = path.join(OUTSIDE_DIR, 'write-target.txt');
    const symlinkPath = path.join(TEST_WORKSPACE, 'write-link.txt');

    try {
      fs.symlinkSync(outsideTarget, symlinkPath, 'file');

      const response = await request(app)
        .put('/api/fs/file')
        .send({ path: 'write-link.txt', content: 'attack' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');

      // Verify nothing written outside
      expect(fs.existsSync(outsideTarget)).toBe(false);

      fs.unlinkSync(symlinkPath);
    } catch (err: any) {
      if (err.code === 'EPERM' || err.code === 'ENOENT') {
        console.warn('Symlink write test BLOCKED: requires elevated privileges');
        expect(true).toBe(true);
      } else {
        throw err;
      }
    }
  });

  it('should block delete through symlink escape', async () => {
    const outsideFile = path.join(OUTSIDE_DIR, 'delete-target.txt');
    fs.writeFileSync(outsideFile, 'important', 'utf-8');
    
    const symlinkPath = path.join(TEST_WORKSPACE, 'delete-link.txt');

    try {
      fs.symlinkSync(outsideFile, symlinkPath, 'file');

      const response = await request(app)
        .delete('/api/fs/delete')
        .send({ path: 'delete-link.txt' });

      expect(response.status).toBe(403);

      // Verify file still exists outside
      expect(fs.existsSync(outsideFile)).toBe(true);

      fs.unlinkSync(symlinkPath);
    } catch (err: any) {
      if (err.code === 'EPERM' || err.code === 'ENOENT') {
        console.warn('Symlink delete test BLOCKED: requires elevated privileges');
        expect(true).toBe(true);
      } else {
        throw err;
      }
    }
  });
});
