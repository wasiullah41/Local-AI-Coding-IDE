const fs = require('fs');
const path = require('path');

const TEST_WORKSPACE = path.resolve(__dirname, 'test-workspace-symlink');
const OUTSIDE_DIR = path.resolve(__dirname, 'test-outside-symlink');

// Clean up
if (fs.existsSync(TEST_WORKSPACE)) fs.rmdirSync(TEST_WORKSPACE, { recursive: true, force: true });
if (fs.existsSync(OUTSIDE_DIR)) fs.rmdirSync(OUTSIDE_DIR, { recursive: true, force: true });

fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
fs.mkdirSync(OUTSIDE_DIR, { recursive: true });

const outsideFile = path.join(OUTSIDE_DIR, 'target.txt');
const symlinkPath = path.join(TEST_WORKSPACE, 'link.txt');

console.log('Creating outside file:', outsideFile);
fs.writeFileSync(outsideFile, 'outside content', 'utf-8');

console.log('Creating symlink from', symlinkPath, 'to', outsideFile);
try {
  fs.symlinkSync(outsideFile, symlinkPath, 'file');
  console.log('Symlink created successfully');

  console.log('Testing lstat on symlink:');
  const stats = fs.lstatSync(symlinkPath);
  console.log('isSymbolicLink:', stats.isSymbolicLink());

  console.log('Testing realpath on symlink:');
  const realPath = fs.realpathSync(symlinkPath);
  console.log('Real path:', realPath);

  const workspaceRealPath = fs.realpathSync(TEST_WORKSPACE);
  console.log('Workspace real path:', workspaceRealPath);

  const relative = path.relative(workspaceRealPath, realPath);
  console.log('Relative path:', relative);
  console.log('Starts with ..:', relative.startsWith('..'));
  console.log('Is absolute:', path.isAbsolute(relative));

} catch (err) {
  console.error('Error:', err.message);
}

// Clean up
setTimeout(() => {
  if (fs.existsSync(TEST_WORKSPACE)) fs.rmdirSync(TEST_WORKSPACE, { recursive: true, force: true });
  if (fs.existsSync(OUTSIDE_DIR)) fs.rmdirSync(OUTSIDE_DIR, { recursive: true, force: true });
}, 1000);