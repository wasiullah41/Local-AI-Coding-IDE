import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import app from '../src/app';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';

/**
 * A Windows directory junction redirects any path underneath it to its target,
 * and `mklink /J` needs no elevation. The pre-existing symlink tests use
 * `fs.symlinkSync`, which is skipped on Windows without admin rights, so
 * nothing covered this case: a link partway along the path let a file read
 * escape the workspace because only the final path component was checked.
 */
const TEST_WORKSPACE = path.resolve(__dirname, '../../test-workspace-junction');
const OUTSIDE_DIR = path.resolve(__dirname, '../../test-outside-junction');
const SECRET = 'TOP_SECRET_9f3a';

function removeLink(linkPath: string) {
  if (!fs.existsSync(linkPath)) return;
  // A junction is a directory, so it must be removed with rmdir, not unlink.
  try {
    execFileSync('cmd', ['/c', 'rmdir', linkPath], { stdio: 'ignore' });
  } catch {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
}

function makeJunction(linkPath: string, targetPath: string) {
  execFileSync('cmd', ['/c', 'mklink', '/J', linkPath, targetPath], { stdio: 'ignore' });
  return fs.existsSync(linkPath);
}

describe('Security - junction escape from the workspace', () => {
  let junctionAvailable = false;
  const linkDir = path.join(TEST_WORKSPACE, 'escape-link');
  const linkFile = path.join(TEST_WORKSPACE, 'escape-file-link.txt');

  beforeAll(() => {
    for (const dir of [TEST_WORKSPACE, OUTSIDE_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(OUTSIDE_DIR, 'secret.txt'), SECRET);
    setWorkspaceRoot(TEST_WORKSPACE);

    try {
      junctionAvailable = makeJunction(linkDir, OUTSIDE_DIR);
    } catch {
      junctionAvailable = false;
    }
    if (junctionAvailable) {
      try {
        junctionAvailable = makeJunction(linkFile, path.join(OUTSIDE_DIR, 'secret.txt'));
      } catch {
        // keep whatever we managed to create
      }
    }
  });

  afterAll(() => {
    removeLink(linkDir);
    removeLink(linkFile);
    for (const dir of [TEST_WORKSPACE, OUTSIDE_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('blocks reading a file THROUGH a directory junction', async () => {
    if (!junctionAvailable) {
      console.warn('Junction test SKIPPED: mklink /J unavailable');
      return;
    }
    const response = await request(app).get('/api/fs/file').query({
      path: path.join(TEST_WORKSPACE, 'escape-link', 'secret.txt'),
    });

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain(SECRET);
  });

  it('blocks writing a new file THROUGH a directory junction', async () => {
    if (!junctionAvailable) return;

    const response = await request(app)
      .post('/api/fs/file')
      .send({ path: path.join(TEST_WORKSPACE, 'escape-link', 'planted.txt'), content: 'nope' });

    expect(response.status).toBe(403);
    expect(fs.existsSync(path.join(OUTSIDE_DIR, 'planted.txt'))).toBe(false);
  });

  it('blocks deleting a file THROUGH a directory junction', async () => {
    if (!junctionAvailable) return;

    const response = await request(app)
      .delete('/api/fs/delete')
      .query({ path: path.join(TEST_WORKSPACE, 'escape-link', 'secret.txt') });

    expect(response.status).toBe(403);
    expect(fs.existsSync(path.join(OUTSIDE_DIR, 'secret.txt'))).toBe(true);
  });

  it('blocks listing a directory junction', async () => {
    if (!junctionAvailable) return;

    const response = await request(app).get('/api/fs/directory').query({ path: linkDir });

    expect(response.status).toBe(403);
  });

  it('blocks reading through a junction that is the final component', async () => {
    if (!junctionAvailable) return;

    const response = await request(app).get('/api/fs/file').query({ path: linkFile });

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain(SECRET);
  });

  it('still allows ordinary files inside the workspace', async () => {
    fs.writeFileSync(path.join(TEST_WORKSPACE, 'fine.txt'), 'ordinary content');
    const response = await request(app)
      .get('/api/fs/file')
      .query({ path: path.join(TEST_WORKSPACE, 'fine.txt') });

    expect(response.status).toBe(200);
    expect(response.body.data.content).toContain('ordinary content');
  });

  it('still allows creating new files and directories in the workspace', async () => {
    const created = await request(app)
      .post('/api/fs/file')
      .send({ path: path.join(TEST_WORKSPACE, 'new.txt'), content: 'hello' });
    expect(created.status).toBe(200);

    const nested = path.join(TEST_WORKSPACE, 'a', 'b', 'c.txt');
    const dir = await request(app)
      .post('/api/fs/directory')
      .send({ path: path.join(TEST_WORKSPACE, 'a', 'b') });
    expect([200, 201]).toContain(dir.status);

    const file = await request(app).post('/api/fs/file').send({ path: nested, content: 'deep' });
    expect([200, 201]).toContain(file.status);
    expect(fs.existsSync(nested)).toBe(true);
  });
});
