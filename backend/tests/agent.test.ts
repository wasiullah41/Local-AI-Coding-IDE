import { AgentOrchestrator } from '../src/ai/agent/agentOrchestrator';
import { createInitialState } from '../src/ai/agent/agentState';
import { toolRegistry } from '../src/ai/tools/toolRegistry';
import { MockLLMProvider } from '../src/ai/llm/mockLlmProvider';
import { filesystemService } from '../src/services/filesystem/filesystem.service';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import path from 'path';

describe('Agent E2E', () => {
    const workspaceRoot = 'D:/Local AI Coding IDE/qa_workspace';

    beforeAll(async () => {
        setWorkspaceRoot(workspaceRoot);
        await filesystemService.createDirectory(workspaceRoot);
    });

    afterAll(async () => {
        await filesystemService.delete(workspaceRoot);
    });

    it('should create hello.py', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Create hello.py', workspaceRoot);

        mockLLM.setResponses('test-scenario', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: 'hello.py', content: 'print("Hello from Phase 9")' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'hello.py created' }) }
        ]);

        await orchestrator.run(state);

        expect(state.status).toBe('COMPLETED');
        const fileContent = await filesystemService.readFile(path.join(workspaceRoot, 'hello.py'));
        expect(fileContent.content).toBe('print("Hello from Phase 9")');
    });

    it('should fix buggy add function', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Fix the buggy add function', workspaceRoot);

        // Setup: create buggy.py
        await filesystemService.createFile(path.join(workspaceRoot, 'buggy.py'), 'def add(a, b):\n    return a - b');

        mockLLM.setResponses('fix-scenario', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'search_files', arguments: { pattern: 'add' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'read_file', arguments: { path: 'buggy.py' }}) },
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'edit_file', arguments: { path: 'buggy.py', oldText: 'return a - b', newText: 'return a + b' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'Fixed add function' }) }
        ]);

        await orchestrator.run(state);

        expect(state.status).toBe('COMPLETED');
        const fileContent = await filesystemService.readFile(path.join(workspaceRoot, 'buggy.py'));
        expect(fileContent.content).toBe('def add(a, b):\n    return a + b');
    });
});
