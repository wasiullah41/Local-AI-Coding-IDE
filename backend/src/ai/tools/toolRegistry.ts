import { AITool, AIToolResult } from './toolTypes';
import {
  PermissionManager,
  PermissionType,
  permissionManager,
  type PermissionRequestPayload,
} from '../permissions/permissionManager';
import { readFileTool } from './readFile.tool';
import { listDirectoryTool } from './listDirectory.tool';
import { searchFilesTool } from './searchFiles.tool';
import { createFileTool } from './createFile.tool';
import { editFileTool } from './editFile.tool';
import { deleteFileTool } from './deleteFile.tool';
import { terminalTool, refuseCommand } from './terminal.tool';
import { gitStatusTool } from './gitStatus.tool';
import { gitDiffTool } from './gitDiff.tool';
import { verifyTool } from './verify.tool';

export interface RegisteredTool extends AITool {
  permission: PermissionType;
  /** Human readable label used in the permission dialog. */
  permissionAction: string;
  /** Pulls the sensitive detail (command / path) out of the tool arguments. */
  describeRequest: (args: Record<string, unknown>) => { detail?: string; reason?: string };
  /**
   * Optional refusal check that runs *before* the user is asked. Returning a
   * string means "this call is never allowed", so no dialog is shown and the
   * tool is not executed.
   */
  precheck?: (args: Record<string, unknown>) => string | undefined;
}

export interface ToolExecutionContext {
  taskId: string;
  signal?: AbortSignal;
  onPermissionRequest?: (payload: PermissionRequestPayload) => void;
  onPermissionResolved?: (payload: {
    requestId: string;
    tool: string;
    allowed: boolean;
  }) => void;
}

function pathOf(args: Record<string, unknown>): string | undefined {
  const value = args.path ?? args.filePath;
  return typeof value === 'string' ? value : undefined;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  constructor() {
    this.register(readFileTool, PermissionType.READ, 'Read a file', (a) => ({
      detail: pathOf(a),
    }));
    this.register(listDirectoryTool, PermissionType.READ, 'List a directory', (a) => ({
      detail: pathOf(a) ?? '.',
    }));
    this.register(searchFilesTool, PermissionType.READ, 'Search the project', (a) => ({
      detail: typeof a.query === 'string' ? `"${a.query}"` : undefined,
    }));
    this.register(createFileTool, PermissionType.WRITE, 'Create a file', (a) => ({
      detail: pathOf(a),
    }));
    this.register(editFileTool, PermissionType.WRITE, 'Edit a file', (a) => ({
      detail: pathOf(a),
    }));
    this.register(deleteFileTool, PermissionType.DELETE, 'Delete a file or folder', (a) => ({
      detail: pathOf(a),
    }));
    this.register(terminalTool, PermissionType.TERMINAL, 'Run a terminal command', (a) => ({
      detail: typeof a.command === 'string' ? a.command : undefined,
    }), (a) => refuseCommand(a.command));
    this.register(gitStatusTool, PermissionType.GIT_STATUS, 'Read Git status', () => ({}));
    this.register(gitDiffTool, PermissionType.GIT_DIFF, 'Read Git diff', () => ({}));
    this.register(verifyTool, PermissionType.TERMINAL, 'Run a verification command', (a) => ({
      detail: typeof a.command === 'string' ? a.command : String(a.type ?? ''),
    }));
  }

  register(
    tool: AITool,
    permission: PermissionType,
    permissionAction: string,
    describeRequest: (args: Record<string, unknown>) => { detail?: string; reason?: string },
    precheck?: (args: Record<string, unknown>) => string | undefined
  ): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' already registered`);
    }
    this.tools.set(tool.name, { ...tool, permission, permissionAction, describeRequest, precheck });
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Every AI filesystem/shell operation goes through here. The tool is checked
   * against the permission policy, the user is asked when confirmation is
   * required, and nothing runs until that answer is in.
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<AIToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Unknown tool '${name}'.` };
    }

    if (context.signal?.aborted) {
      return { success: false, error: 'Cancelled before the tool ran.', cancelled: true };
    }

    // Refusals that need no consent: never show a dialog for something that is
    // going to be refused anyway.
    const refusal = tool.precheck?.(args);
    if (refusal) {
      return { success: false, error: refusal };
    }

    const { detail, reason } = tool.describeRequest(args);

    // The dialog callback fires with the generated id, so it is captured here to
    // keep the resolution event correlatable with the request that caused it.
    let requestId = '';
    const allowed = await permissionManager.authorize(
      {
        taskId: context.taskId,
        type: tool.permission,
        tool: tool.name,
        action: tool.permissionAction,
        detail,
        reason,
        args,
      },
      (payload) => {
        requestId = payload.requestId;
        context.onPermissionRequest?.(payload);
      }
    );

    context.onPermissionResolved?.({ requestId, tool: tool.name, allowed });

    if (!allowed) {
      return {
        success: false,
        denied: true,
        error: `Permission denied by the user for "${tool.permissionAction}".`,
      };
    }

    try {
      return await tool.execute(args, { signal: context.signal, taskId: context.taskId });
    } catch (error) {
      if (context.signal?.aborted || (error as { name?: string }).name === 'AbortError') {
        return { success: false, error: 'Cancelled.', cancelled: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed.',
      };
    }
  }

  listTools(): { name: string; description: string; permission: string; action: string }[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      permission: t.permission,
      action: t.permissionAction,
    }));
  }

  /** Compact catalogue injected into the system prompt so the model knows what it can call. */
  describeForPrompt(): string {
    return Array.from(this.tools.values())
      .map((t) => `- ${t.name}(${Object.keys((t.inputSchema as { properties?: object }).properties ?? {}).join(', ')}): ${t.description}`)
      .join('\n');
  }
}

export const toolRegistry = new ToolRegistry();
