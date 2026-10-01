import { AgentOrchestrator } from '../src/ai/agent/agentOrchestrator';
import { createInitialState } from '../src/ai/agent/agentState';
import { toolRegistry } from '../src/ai/tools/toolRegistry';
import { MockLLMProvider } from '../src/ai/llm/mockLlmProvider';
import { filesystemService } from '../src/services/filesystem/filesystem.service';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import { permissionManager, PermissionType, PermissionAction } from '../src/ai/permissions/permissionManager';
import path from 'path';

describe('Agent Full E2E Audit', () => {
    const workspaceRoot = 'D:/Local AI Coding IDE/qa_audit_workspace';

    beforeAll(async () => {
        setWorkspaceRoot(workspaceRoot);
        await filesystemService.createDirectory(workspaceRoot);
        permissionManager.setPolicy(PermissionType.TERMINAL, 'ALLOW');
    });

    afterAll(async () => {
        await filesystemService.delete(workspaceRoot);
    });

    it('E2E #1: should create and run hello.py', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Create hello.py and run it', workspaceRoot);

        mockLLM.setResponses('test-e2e-1', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: 'hello.js', content: 'console.log("Hello from Phase 9")' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'terminal', arguments: { command: 'node hello.js' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'terminal', arguments: { command: 'echo "verified"' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'hello.js created, run and verified' }) }
        ]);

        await orchestrator.run(state);

        expect(state.status).toBe('COMPLETED');
        expect(state.toolResults.length).toBe(3);
        const fileContent = await filesystemService.readFile(path.join(workspaceRoot, 'hello.js'));
        expect(fileContent.content).toContain('console.log("Hello from Phase 9")');
        expect(state.toolResults[1].success).toBe(true);
        expect(state.toolResults[2].success).toBe(true);
        expect(state.filesChanged).toContain('hello.js');
    });

    it('E2E #3: verify must not act as an arbitrary shell runner', async () => {
        // `verify` runs the project's own package.json scripts. It must refuse
        // to be used as a way to execute an arbitrary command.
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Verify', workspaceRoot);

        mockLLM.setResponses('test-e2e-3', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'verify', arguments: { type: 'command', command: 'echo should-not-run' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'done' }) }
        ]);

        await orchestrator.run(state);

        expect(state.toolResults[0].success).toBe(false);
        expect(state.toolResults[0].error).toMatch(/no "command" script/i);
    });

    it('E2E #2: should fix buggy add function', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Fix the buggy add function', workspaceRoot);

        await filesystemService.createFile(path.join(workspaceRoot, 'buggy.py'), 'def add(a, b):\n    return a - b');

        mockLLM.setResponses('test-e2e-2', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'search_files', arguments: { pattern: 'add' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'read_file', arguments: { path: 'buggy.py' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'edit_file', arguments: { path: 'buggy.py', oldText: 'return a - b', newText: 'return a + b' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'terminal', arguments: { command: 'python -c "from buggy import add; print(add(1, 2))"' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'verify', arguments: { type: 'command', command: 'echo "verified"' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'Fixed add function and verified' }) }
        ]);

        await orchestrator.run(state);

        expect(state.status).toBe('COMPLETED');
        const fileContent = await filesystemService.readFile(path.join(workspaceRoot, 'buggy.py'));
        expect(fileContent.content).toBe('def add(a, b):\n    return a + b');
        expect(state.toolResults.length).toBe(5);
    });
});
