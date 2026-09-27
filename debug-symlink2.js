const fs = require('fs');
const path = require('path');

const TEST_WORKSPACE = path.resolve(__dirname, 'test-workspace-symlink');
const OUTSIDE_DIR = path.resolve(__dirname, 'test-outside-symlink');

// Clean up
if (fs.existsSync(TEST_WORKSPACE)) fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
if (fs.existsSync(OUTSIDE_DIR)) fs.rmSync(OUTSIDE_DIR, { recursive: true, force: true });

fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
fs.mkdirSync(OUTSIDE_DIR, { recursive: true });

const outsideFile = path.join(OUTSIDE_DIR, 'target.txt');
const symlinkPath = path.join(TEST_WORKSPACE, 'link.txt');

console.log('Creating symlink to non-existent target');
console.log('Symlink:', symlinkPath);
console.log('Target:', outsideFile);

try {
  fs.symlinkSync(outsideFile, symlinkPath, 'file');
  console.log('Symlink created successfully');

  console.log('\nTesting lstat on symlink:');
  const stats = fs.lstatSync(symlinkPath);
  console.log('isSymbolicLink:', stats.isSymbolicLink());

  console.log('\nTesting realpath on symlink with non-existent target:');
  try {
    const realPath = fs.realpathSync(symlinkPath);
    console.log('Real path:', realPath);
  } catch (err) {
    console.log('realpath failed:', err.code, err.message);
  }

  console.log('\nTesting readlink:');
  const linkTarget = fs.readlinkSync(symlinkPath);
  console.log('Link target:', linkTarget);

  console.log('\nResolving link target manually:');
  const resolvedTarget = path.resolve(path.dirname(symlinkPath), linkTarget);
  console.log('Resolved target:', resolvedTarget);

  const workspaceRealPath = fs.realpathSync(TEST_WORKSPACE);
  console.log('Workspace:', workspaceRealPath);

  const relative = path.relative(workspaceRealPath, resolvedTarget);
  console.log('Relative:', relative);
  console.log('Starts with ..:', relative.startsWith('..'));

} catch (err) {
  console.error('Error:', err.message);
}

// Clean up
setTimeout(() => {
  if (fs.existsSync(TEST_WORKSPACE)) fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  if (fs.existsSync(OUTSIDE_DIR)) fs.rmSync(OUTSIDE_DIR, { recursive: true, force: true });
}, 1000);
