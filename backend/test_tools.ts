import { toolRegistry } from './src/ai/tools/toolRegistry';
import { setWorkspaceRoot } from './src/middleware/security.middleware';
import path from 'path';

async function run() {
  setWorkspaceRoot(path.resolve(__dirname, '..'));
  const result = await toolRegistry.execute('terminal', { command: 'echo AI_AGENT_TEST' });
  console.log('Result:', JSON.stringify(result));
}
run();
