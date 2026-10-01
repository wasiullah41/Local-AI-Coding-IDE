/**
 * Permission denial round trip.
 *
 * Regression coverage for a test-design gap: the original denied-write test
 * used `create_file`, but `PermissionType.WRITE` is ALLOW by default, so no
 * dialog was ever raised and the denial path was never exercised. These tests
 * use genuinely protected operations (DELETE, TERMINAL) so the round trip is
 * real and cannot be skipped.
 *
 *   request -> PermissionManager -> PERMISSION_REQUESTED -> explicit DENY
 *   -> PERMISSION_RESOLVED -> tool NOT executed -> file untouched
 *   -> denial fed back to the caller
 *
 * The real ToolRegistry, the real PermissionManager and the real filesystem
 * service are used; nothing is mocked.
 *
 * The agent-level case (12a-5) needs a live LLM and only runs when
 * RUN_LIVE_LLM_TESTS=1, so the default suite stays hermetic and fast.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

import { toolRegistry, ToolExecutionContext } from '../src/ai/tools/toolRegistry';
import { permissionManager, PermissionType } from '../src/ai/permissions/permissionManager';
import { setWorkspaceRoot } from '../src/middleware/security.middleware';
import { parseAgentResponse } from '../src/ai/agent/agentOrchestrator';

jest.setTimeout(600_000);

const WS = path.join(os.tmpdir(), 'forgeai-permission-denial-tests');
const LIVE = process.env.RUN_LIVE_LLM_TESTS === '1';

function freshWorkspace() {
  fs.rmSync(WS, { recursive: true, force: true });
  fs.mkdirSync(WS, { recursive: true });
  setWorkspaceRoot(WS);
}

function denyAll(): ToolExecutionContext['onPermissionRequest'] {
  return (payload) => {
    // Explicit DENY, exactly as the renderer sends when the user picks "Deny".
    permissionManager.resolveByRequestId(payload.requestId, false, false);
  };
}

beforeEach(() => {
  freshWorkspace();
});

afterEach(() => {
  // Restore the shipped policy so no test can leak a stricter setting.
  permissionManager.setPolicy(PermissionType.WRITE, 'ALLOW');
  permissionManager.setPolicy(PermissionType.DELETE, 'REQUIRE_CONFIRMATION');
  permissionManager.setPolicy(PermissionType.TERMINAL, 'REQUIRE_CONFIRMATION');
});

describe('permission denial round trip', () => {
  test('DELETE denial: dialog raised, denied, tool never runs, file survives', async () => {
    const victim = path.join(WS, 'keep-me.txt');
    fs.writeFileSync(victim, 'precious data');

    const requested: any[] = [];
    const resolved: any[] = [];
    const result = await toolRegistry.execute(
      'delete_file',
      { path: 'keep-me.txt' },
      {
        taskId: 'perm-delete',
        onPermissionRequest: (p) => {
          requested.push(p);
          permissionManager.resolveByRequestId(p.requestId, false, false);
        },
        onPermissionResolved: (p) => resolved.push(p),
      }
    );

    // A real dialog was raised, for a genuinely protected operation.
    expect(requested).toHaveLength(1);
    expect(requested[0].type).toBe(PermissionType.DELETE);
    expect(requested[0].tool).toBe('delete_file');
    expect(requested[0].detail).toBe('keep-me.txt');

    // It was resolved as denied.
    expect(resolved).toHaveLength(1);
    expect(resolved[0].allowed).toBe(false);

    // The tool reported a denial rather than an error.
    expect(result.success).toBe(false);
    expect(result.denied).toBe(true);
    expect(result.error).toMatch(/denied/i);

    // The tool did NOT execute: the file is untouched.
    expect(fs.existsSync(victim)).toBe(true);
    expect(fs.readFileSync(victim, 'utf-8')).toBe('precious data');

    // No dialog left pending.
    expect(permissionManager.getPendingCount()).toBe(0);
  });

  test('TERMINAL denial: dialog raised, denied, command never runs', async () => {
    const marker = path.join(WS, 'ran.txt');
    const requested: any[] = [];
    const resolved: any[] = [];
    const result = await toolRegistry.execute(
      'terminal',
      { command: `python -c "open(r'${marker}','w').write('x')"`, timeoutMs: 20000 },
      {
        taskId: 'perm-terminal',
        onPermissionRequest: (p) => {
          requested.push(p);
          permissionManager.resolveByRequestId(p.requestId, false, false);
        },
        onPermissionResolved: (p) => resolved.push(p),
      }
    );

    expect(requested).toHaveLength(1);
    expect(requested[0].type).toBe(PermissionType.TERMINAL);
    expect(resolved[0].allowed).toBe(false);
    expect(result.success).toBe(false);
    expect(result.denied).toBe(true);
    // The command must never have run, so its side effect is absent.
    expect(fs.existsSync(marker)).toBe(false);
  });

  test('the denial is fed back to the caller as readable feedback', async () => {
    const result = await toolRegistry.execute(
      'delete_file',
      { path: 'anything.txt' },
      { taskId: 'perm-feedback', onPermissionRequest: denyAll() }
    );
    // This is exactly what the orchestrator pushes into the model's history.
    expect(result.denied).toBe(true);
    expect(result.error).toBe('Permission denied by the user for "Delete a file or folder".');
  });

  test('an unanswered dialog times out into a denial and nothing runs', async () => {
    const victim = path.join(WS, 'timeout.txt');
    fs.writeFileSync(victim, 'still here');

    jest.useFakeTimers();
    // onPermissionRequest is deliberately absent, so nobody ever answers.
    const promise = toolRegistry.execute(
      'delete_file',
      { path: 'timeout.txt' },
      { taskId: 'perm-timeout' }
    );
    jest.advanceTimersByTime(120_001); // past REQUEST_TIMEOUT_MS
    const result = await promise;
    jest.useRealTimers();

    expect(permissionManager.getPendingCount()).toBe(0);
    expect(result.success).toBe(false);
    expect(result.denied).toBe(true);
    expect(fs.existsSync(victim)).toBe(true);
  });

  test('control: an ALLOW decision really does execute the tool', async () => {
    const requested: any[] = [];
    const target = path.join(WS, 'removable.txt');
    fs.writeFileSync(target, 'bye');

    const result = await toolRegistry.execute(
      'delete_file',
      { path: 'removable.txt' },
      {
        taskId: 'perm-allow',
        onPermissionRequest: (p) => {
          requested.push(p);
          permissionManager.resolveByRequestId(p.requestId, true, false);
        },
      }
    );

    expect(requested).toHaveLength(1);
    expect(result.success).toBe(true);
    expect(result.denied).toBeUndefined();
    expect(fs.existsSync(target)).toBe(false);
  });

  test('a denied tool call is still readable by the response parser', () => {
    const raw = JSON.stringify({
      type: 'TOOL_CALL',
      tool: 'delete_file',
      arguments: { path: 'x.txt' },
    });
    expect(parseAgentResponse(raw)).toEqual({
      type: 'TOOL_CALL',
      tool: 'delete_file',
      arguments: { path: 'x.txt' },
    });
  });
});

const describeLive = LIVE ? describe : describe.skip;

describeLive('real agent task with denied writes (live LLM)', () => {
  test('a denied write is refused and the agent is told, so no file is created', async () => {
    const { AgentOrchestrator } = await import('../src/ai/agent/agentOrchestrator');
    const { createInitialState } = await import('../src/ai/agent/agentState');
    const { llmProviderFactory } = await import('../src/ai/llm/llmProviderFactory');

    // Protect writes for this task only, so a create_file call deterministically
    // raises a dialog.
    permissionManager.setPolicy(PermissionType.WRITE, 'REQUIRE_CONFIRMATION');

    const target = path.join(WS, 'report.py');
    const taskId = `perm-agent-${Date.now()}`;
    // Neutral wording on purpose. An earlier version asked for "denied.py"
    // containing "should not exist", and the model declined on semantic
    // grounds, so no dialog was ever reached.
    const state = createInitialState(
      'Create report.py in the workspace containing a function quarterly() that returns the number 4.',
      WS,
      taskId
    );

    const events: any[] = [];
    const requested: any[] = [];
    const resolved: any[] = [];

    const final = await new AgentOrchestrator(llmProviderFactory.getProvider(), toolRegistry).run(
      state,
      {
        onEvent: (type, phase, payload) => events.push({ type, phase, payload }),
        context: {
          taskId,
          onPermissionRequest: (p) => {
            requested.push(p);
            permissionManager.resolveByRequestId(p.requestId, false, false);
          },
          onPermissionResolved: (p) => resolved.push(p),
        } as ToolExecutionContext,
      }
    );

    // A real dialog was raised and explicitly denied.
    expect(requested.length).toBeGreaterThan(0);
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((r) => r.allowed === false)).toBe(true);

    // A denied tool result was reported back to the agent.
    const deniedResults = events.filter(
      (e) => e.type === 'TOOL_RESULT' && e.payload.denied === true
    );
    expect(deniedResults.length).toBeGreaterThan(0);

    // The agent was explicitly told the user denied it and must not retry.
    const denialNotice = state.messages.find((m) => m.role === 'user' && /DENIED/i.test(m.content));
    expect(denialNotice).toBeDefined();

    // And the file was never created.
    expect(fs.existsSync(target)).toBe(false);
    expect(final.status).toBe('COMPLETED');
  });
});
