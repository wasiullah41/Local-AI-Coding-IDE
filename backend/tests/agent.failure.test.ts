import { AgentOrchestrator } from '../src/ai/agent/agentOrchestrator';
import { createInitialState } from '../src/ai/agent/agentState';
import { toolRegistry } from '../src/ai/tools/toolRegistry';
import { MockLLMProvider } from '../src/ai/llm/mockLlmProvider';
import { filesystemService } from '../src/services/filesystem/filesystem.service';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import path from 'path';

describe('Agent Failure Tests', () => {
    const workspaceRoot = 'D:/Local AI Coding IDE/qa_failure_workspace';

    beforeAll(async () => {
        setWorkspaceRoot(workspaceRoot);
        await filesystemService.createDirectory(workspaceRoot);
    });

    afterAll(async () => {
        await filesystemService.delete(workspaceRoot);
    });

    it('should fail on path traversal attempt', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Traverse outside', workspaceRoot);

        mockLLM.setResponses('traverse-scenario', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: '../traversal.py', content: 'hack' }}) }
        ]);

        await orchestrator.run(state);

        expect(state.status).toBe('FAILED');
        // The tool result should have the error
        expect(state.toolResults[0].success).toBe(false);
    });
});
