import { AgentOrchestrator } from '../src/ai/agent/agentOrchestrator';
import { createInitialState } from '../src/ai/agent/agentState';
import { toolRegistry } from '../src/ai/tools/toolRegistry';
import { ChatMessage, LLMProvider } from '../src/ai/llm/llmProvider';
import { filesystemService } from '../src/services/filesystem/filesystem.service';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import path from 'path';

/** Records every prompt it is handed so the tests can assert on it. */
class RecordingProvider implements LLMProvider {
    readonly name = 'recording';
    readonly prompts: ChatMessage[][] = [];
    private readonly script: string[];

    constructor(script: string[]) {
        this.script = [...script];
    }

    async chat(messages: ChatMessage[]): Promise<{ content: string }> {
        this.prompts.push(messages.map((m) => ({ ...m })));
        return { content: this.script.shift() ?? JSON.stringify({ type: 'FINAL', content: 'done' }) };
    }

    getModelInfo() {
        return { model: 'recording', provider: this.name };
    }

    async isAvailable() {
        return true;
    }
}

const lastPrompt = (provider: RecordingProvider): string =>
    provider.prompts[provider.prompts.length - 1]
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n---\n');

describe('Agent prompt assembly', () => {
    const workspaceRoot = 'D:/Local AI Coding IDE/qa_prompt_workspace';

    beforeAll(async () => {
        setWorkspaceRoot(workspaceRoot);
        await filesystemService.createDirectory(workspaceRoot);
        await filesystemService.createFile(
            path.join(workspaceRoot, 'context-probe.txt'),
            'UNIQUE_CONTEXT_MARKER lives in this file.'
        );
    });

    afterAll(async () => {
        await filesystemService.delete(workspaceRoot);
    });

    it('sends the task and tool catalogue in the system prompt', async () => {
        const provider = new RecordingProvider([
            JSON.stringify({ type: 'FINAL', content: 'ok' }),
        ]);

        await new AgentOrchestrator(provider, toolRegistry).run(
            createInitialState('Summarise the project', workspaceRoot)
        );

        const prompt = lastPrompt(provider);
        expect(prompt).toContain('Summarise the project');
        expect(prompt).toContain('read_file');
        // The reply contract must be spelled out, or the model answers in prose.
        expect(prompt).toContain('"type":"TOOL_CALL"');
    });

    it('carries earlier tool results into later turns', async () => {
        const provider = new RecordingProvider([
            JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: 'carried.txt', content: 'data' } }),
            JSON.stringify({ type: 'FINAL', content: 'created' }),
        ]);

        await new AgentOrchestrator(provider, toolRegistry).run(
            createInitialState('Create carried.txt', workspaceRoot)
        );

        // Second prompt is the one that must show history.
        expect(provider.prompts).toHaveLength(2);
        const second = lastPrompt(provider);
        expect(second).toContain('carried.txt');
        expect(second).toContain('Tool result:');
    });

    it('inlines the content of files the agent has read', async () => {
        const provider = new RecordingProvider([
            JSON.stringify({ type: 'TOOL_CALL', tool: 'read_file', arguments: { path: 'context-probe.txt' } }),
            JSON.stringify({ type: 'FINAL', content: 'read it' }),
        ]);

        await new AgentOrchestrator(provider, toolRegistry).run(
            createInitialState('Read context-probe.txt', workspaceRoot)
        );

        const second = lastPrompt(provider);
        expect(second).toContain('FILES ALREADY READ');
        expect(second).toContain('UNIQUE_CONTEXT_MARKER');
    });

    it('lists changed files so the agent knows its own effects', async () => {
        const provider = new RecordingProvider([
            JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: 'tracked.txt', content: 'x' } }),
            JSON.stringify({ type: 'FINAL', content: 'done' }),
        ]);

        await new AgentOrchestrator(provider, toolRegistry).run(
            createInitialState('Create tracked.txt', workspaceRoot)
        );

        expect(lastPrompt(provider)).toContain('FILES CHANGED SO FAR');
        expect(lastPrompt(provider)).toContain('tracked.txt');
    });

    it('never sends a role the provider contract does not allow', async () => {
        const provider = new RecordingProvider([
            JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: 'roles.txt', content: 'x' } }),
            JSON.stringify({ type: 'FINAL', content: 'done' }),
        ]);

        await new AgentOrchestrator(provider, toolRegistry).run(
            createInitialState('Create roles.txt', workspaceRoot)
        );

        for (const prompt of provider.prompts) {
            for (const message of prompt) {
                expect(['system', 'user', 'assistant']).toContain(message.role);
            }
        }
    });
});
