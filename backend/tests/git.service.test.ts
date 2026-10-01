import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gitService } from '../src/services/git/git.service';

const git = (args: string[], cwd: string): string =>
    execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });

describe('GitService error reporting', () => {
    let repo: string;

    beforeAll(() => {
        repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ide_git_service_'));
        git(['init', '-q'], repo);
        git(['config', 'user.email', 'test@local'], repo);
        git(['config', 'user.name', 'Test'], repo);
        fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
        git(['add', 'a.txt'], repo);
        git(['commit', '-q', '-m', 'init'], repo);
    });

    afterAll(() => {
        fs.rmSync(repo, { recursive: true, force: true });
    });

    it('reports a commit with nothing staged as a 400, not a server fault', async () => {
        await expect(gitService.commit(repo, 'nothing to do')).rejects.toMatchObject({
            statusCode: 400,
            code: 'GIT_ERROR',
        });
    });

    it('rejects an empty commit message without running git', async () => {
        await expect(gitService.commit(repo, '   ')).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it("does not leak node's Command failed wrapper into the message", async () => {
        let message = '';
        try {
            await gitService.commit(repo, 'nothing to do');
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).not.toContain('Command failed:');
        // Git's own explanation should be what the user sees.
        expect(message).toMatch(/nothing to commit|no changes added/i);
    });

    it('quotes commit messages verbatim instead of passing them to a shell', async () => {
        const tricky = 'quotes " and $dollar and `tick` and ; semicolon';
        fs.writeFileSync(path.join(repo, 'b.txt'), 'two\n');
        git(['add', 'b.txt'], repo);

        await gitService.commit(repo, tricky);

        // Read the subject back with git itself; a shell would have mangled it.
        const subject = git(['log', '-1', '--pretty=%s'], repo).trim();
        expect(subject).toBe(tricky);
    });

    it('degrades gracefully outside a repository instead of failing', async () => {
        const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'ide_not_git_'));
        try {
            const status = await gitService.getStatus(plain);
            expect(status.isRepository).toBe(false);
            expect(status.changes).toEqual([]);
        } finally {
            fs.rmSync(plain, { recursive: true, force: true });
        }
    });
});
