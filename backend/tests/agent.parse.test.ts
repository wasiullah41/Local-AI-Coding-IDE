/**
 * Regression tests for the response parser.
 *
 * A model returned tool arguments flattened onto the envelope:
 *   {"tool":"create_file","path":"/workspace/example.py","content":"..."}
 * The parser did `arguments: parsed.arguments ?? parsed.args ?? {}`, so `path`
 * and `content` were silently dropped and the tool ran with no arguments.
 *
 * The documented TOOL_CALL format must keep working unchanged; `args` and
 * `tool_input` must keep working; the flat shape must now be honoured; and
 * control/metadata fields must never leak through as tool arguments.
 */
import { parseAgentResponse } from '../src/ai/agent/agentOrchestrator';

const EXPECTED = {
  path: '/workspace/example.py',
  content: 'print(1)',
  overwrite: true,
};

describe('parseAgentResponse: tool-call argument shapes', () => {
  test('A. documented TOOL_CALL with `arguments`', () => {
    const result = parseAgentResponse(
      JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', arguments: { ...EXPECTED } })
    );
    expect(result).toEqual({ type: 'TOOL_CALL', tool: 'create_file', arguments: { ...EXPECTED } });
  });

  test('B. `args` variant', () => {
    const result = parseAgentResponse(
      JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', args: { ...EXPECTED } })
    );
    expect(result).toEqual({ type: 'TOOL_CALL', tool: 'create_file', arguments: { ...EXPECTED } });
  });

  test('C. flat arguments on the envelope', () => {
    const result = parseAgentResponse(
      JSON.stringify({
        type: 'TOOL_CALL',
        tool: 'create_file',
        path: EXPECTED.path,
        content: EXPECTED.content,
        overwrite: EXPECTED.overwrite,
      })
    );
    expect(result).toEqual({ type: 'TOOL_CALL', tool: 'create_file', arguments: { ...EXPECTED } });
  });

  test('A, B and C all normalize to the same tool name and arguments', () => {
    const shapes = [
      { type: 'TOOL_CALL', tool: 'create_file', arguments: { ...EXPECTED } },
      { type: 'TOOL_CALL', tool: 'create_file', args: { ...EXPECTED } },
      { type: 'TOOL_CALL', tool: 'create_file', ...EXPECTED },
    ].map((s) => parseAgentResponse(JSON.stringify(s)));

    expect(shapes[1]).toEqual(shapes[0]);
    expect(shapes[2]).toEqual(shapes[0]);
  });

  test('C. flat arguments with no `type` marker at all', () => {
    const result = parseAgentResponse(
      JSON.stringify({ tool: 'create_file', path: EXPECTED.path, content: EXPECTED.content })
    );
    expect(result).toEqual({
      type: 'TOOL_CALL',
      tool: 'create_file',
      arguments: { path: EXPECTED.path, content: EXPECTED.content },
    });
  });

  test('flat shape works inside a markdown fence and with trailing commas', () => {
    expect(
      parseAgentResponse('```json\n{"tool": "create_file", "path": "a.py", "content": "x",}\n```')
    ).toEqual({ type: 'TOOL_CALL', tool: 'create_file', arguments: { path: 'a.py', content: 'x' } });
  });

  test('`tool_input` variant is still honoured', () => {
    expect(
      parseAgentResponse(JSON.stringify({ tool: 'read_file', tool_input: { path: 'a.py' } }))
    ).toEqual({ type: 'TOOL_CALL', tool: 'read_file', arguments: { path: 'a.py' } });
  });
});

describe('parseAgentResponse: control fields are never passed as arguments', () => {
  test('`type`/`tool` are stripped from flat arguments', () => {
    const result = parseAgentResponse(
      JSON.stringify({ type: 'TOOL_CALL', tool: 'create_file', path: 'a.py' })
    );
    expect(result?.arguments).toEqual({ path: 'a.py' });
    expect(result?.arguments).not.toHaveProperty('type');
    expect(result?.arguments).not.toHaveProperty('tool');
  });

  test('a stray `arguments` next to flat keys is authoritative, not merged', () => {
    const result = parseAgentResponse(
      JSON.stringify({
        tool: 'create_file',
        arguments: { path: 'authoritative.py', content: 'a' },
        path: 'stray.py',
        content: 'b',
      })
    );
    expect(result?.arguments).toEqual({ path: 'authoritative.py', content: 'a' });
  });

  test('`args` is not passed through as a literal argument named "args"', () => {
    const result = parseAgentResponse(
      JSON.stringify({ tool: 'terminal', args: { command: 'echo hi' } })
    );
    expect(result?.arguments).toEqual({ command: 'echo hi' });
    expect(result?.arguments).not.toHaveProperty('args');
  });

  test('an empty `arguments` object still wins, matching previous behaviour', () => {
    const result = parseAgentResponse(
      JSON.stringify({ tool: 'git_status', arguments: {}, path: 'ignored.py' })
    );
    expect(result?.arguments).toEqual({});
  });

  test('a tool call with no arguments at all yields an empty object', () => {
    expect(parseAgentResponse(JSON.stringify({ tool: 'git_status' }))?.arguments).toEqual({});
  });

  test('the `verify` tool keeps its real `type` argument in the flat shape', () => {
    // `type` is a genuine argument of the verify tool, so it must survive
    // unless it carries an envelope value.
    const result = parseAgentResponse(JSON.stringify({ tool: 'verify', type: 'build' }));
    expect(result).toEqual({ type: 'TOOL_CALL', tool: 'verify', arguments: { type: 'build' } });
  });

  test('envelope `type` values are still treated as control, case-insensitively', () => {
    for (const marker of ['TOOL_CALL', 'tool_call']) {
      const result = parseAgentResponse(
        JSON.stringify({ type: marker, tool: 'create_file', path: 'a.py' })
      );
      expect(result?.arguments).toEqual({ path: 'a.py' });
    }
  });
});

describe('parseAgentResponse: FINAL replies are unaffected', () => {
  test('documented FINAL shape', () => {
    expect(parseAgentResponse(JSON.stringify({ type: 'FINAL', content: 'all done' }))).toEqual({
      type: 'FINAL',
      content: 'all done',
    });
  });

  test('FINAL wins even if a tool is mentioned, so nothing is executed', () => {
    const result = parseAgentResponse(
      JSON.stringify({ type: 'FINAL', content: 'I declined.', tool: 'create_file' })
    );
    expect(result?.type).toBe('FINAL');
    expect(result?.tool).toBeUndefined();
  });

  test('a bare content string is still FINAL, not a flat tool call', () => {
    expect(parseAgentResponse(JSON.stringify({ content: 'no tool needed' }))?.type).toBe('FINAL');
  });

  test('malformed input still returns null rather than throwing', () => {
    expect(parseAgentResponse('not json at all')).toBeNull();
    expect(parseAgentResponse('')).toBeNull();
  });
});
