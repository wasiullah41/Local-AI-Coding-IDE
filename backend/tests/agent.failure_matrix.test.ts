import { AgentOrchestrator } from '../src/ai/agent/agentOrchestrator';
import { createInitialState } from '../src/ai/agent/agentState';
import { toolRegistry } from '../src/ai/tools/toolRegistry';
import { MockLLMProvider } from '../src/ai/llm/mockLlmProvider';
import { filesystemService } from '../src/services/filesystem/filesystem.service';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import { permissionManager } from '../src/ai/permissions/permissionManager';
import path from 'path';

describe('Agent Failure and Security Matrix', () => {
    const workspaceRoot = 'D:/Local AI Coding IDE/qa_failure_matrix_workspace';
    const outsidePath = 'D:/FileOutsideWorkspace.txt';

    beforeAll(async () => {
        setWorkspaceRoot(workspaceRoot);
        await filesystemService.createDirectory(workspaceRoot);
    });

    afterAll(async () => {
        await filesystemService.delete(workspaceRoot);
    });

    it('should fail: Absolute path outside workspace', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Try access outside', workspaceRoot);

        mockLLM.setResponses('outside-path', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: outsidePath, content: 'hack' }}) }
        ]);

        await orchestrator.run(state);

        expect(state.status).toBe('FAILED');
        expect(state.toolResults[0].success).toBe(false);
    });

    it('should fail: Terminal permission denied', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Run command', workspaceRoot);

        mockLLM.setResponses('terminal-denied', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'terminal', arguments: { command: 'echo denied-should-not-appear' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'stopping' }) }
        ]);

        // Answer the permission dialog with "deny", exactly as the UI does.
        const asked: string[] = [];
        await orchestrator.run(state, {
            context: {
                taskId: 'deny-test',
                onPermissionRequest: (payload) => {
                    asked.push(payload.tool);
                    permissionManager.resolveByRequestId(payload.requestId, false, false);
                },
            },
        });

        expect(asked).toContain('terminal');
        expect(state.toolResults[0].success).toBe(false);
        expect(state.toolResults[0].denied).toBe(true);
        // The command must genuinely not have run.
        const output = state.toolResults[0].data as { stdout?: string } | undefined;
        expect(output?.stdout ?? '').not.toContain('denied-should-not-appear');
    });

    it('should run the command when the user allows it', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Run command', workspaceRoot);

        mockLLM.setResponses('terminal-allowed', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'terminal', arguments: { command: 'echo allowed-marker' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'done' }) }
        ]);

        await orchestrator.run(state, {
            context: {
                taskId: 'allow-test',
                onPermissionRequest: (payload) => {
                    permissionManager.resolveByRequestId(payload.requestId, true, false);
                },
            },
        });

        expect(state.toolResults[0].success).toBe(true);
        const output = state.toolResults[0].data as { stdout?: string } | undefined;
        expect(output?.stdout ?? '').toContain('allowed-marker');
    });

    it('should block a destructive command outright, without asking', async () => {
        const mockLLM = new MockLLMProvider();
        const orchestrator = new AgentOrchestrator(mockLLM, toolRegistry);
        const state = createInitialState('Wipe the disk', workspaceRoot);

        mockLLM.setResponses('terminal-blocked', [
            { content: JSON.stringify({ type: 'TOOL_CALL', tool: 'terminal', arguments: { command: 'format c:' }}) },
            { content: JSON.stringify({ type: 'FINAL', content: 'done' }) }
        ]);

        let asked = 0;
        await orchestrator.run(state, {
            context: {
                taskId: 'blocked-test',
                onPermissionRequest: () => {
                    asked++;
                },
            },
        });

        expect(asked).toBe(0);
        expect(state.toolResults[0].success).toBe(false);
        expect(state.toolResults[0].error).toMatch(/blocked/i);
    });
});
