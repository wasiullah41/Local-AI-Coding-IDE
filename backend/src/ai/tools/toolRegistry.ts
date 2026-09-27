import { AITool, AIToolResult } from './toolTypes';
import { PermissionManager, PermissionType, permissionManager } from '../permissions/permissionManager';
import { readFileTool } from './readFile.tool';
import { listDirectoryTool } from './listDirectory.tool';
import { searchFilesTool } from './searchFiles.tool';
import { createFileTool } from './createFile.tool';
import { editFileTool } from './editFile.tool';
import { deleteFileTool } from './deleteFile.tool';
import { terminalTool } from './terminal.tool';
import { gitStatusTool } from './gitStatus.tool';
import { gitDiffTool } from './gitDiff.tool';
import { verifyTool } from './verify.tool';

export class ToolRegistry {
  private tools: Map<string, AITool & { permission: PermissionType }> = new Map();

  constructor() {
    this.register(readFileTool, PermissionType.READ);
    this.register(listDirectoryTool, PermissionType.READ);
    this.register(searchFilesTool, PermissionType.READ);
    this.register(createFileTool, PermissionType.WRITE);
    this.register(editFileTool, PermissionType.WRITE);
    this.register(deleteFileTool, PermissionType.DELETE);
    this.register(terminalTool, PermissionType.TERMINAL);
    this.register(gitStatusTool, PermissionType.GIT_STATUS);
    this.register(gitDiffTool, PermissionType.GIT_DIFF);
    this.register(verifyTool, PermissionType.TERMINAL);
  }

  register(tool: AITool, permission: PermissionType): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' already registered`);
    }
    this.tools.set(tool.name, { ...tool, permission });
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): (AITool & { permission: PermissionType }) | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, args: Record<string, unknown>): Promise<AIToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool '${name}' not found` };
    }

    const permissionAction = permissionManager.checkPermission(tool.permission);
    if (permissionAction === 'DENY') {
      return { success: false, error: `Permission denied: ${tool.permission}` };
    }
    if (permissionAction === 'REQUIRE_CONFIRMATION') {
      // In a real implementation we would block here and ask the user.
      // For now, we simulate confirmation required.
      return { success: false, error: `Permission required: ${tool.permission} (Confirmation not yet implemented)` };
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  listTools(): { name: string; description: string }[] {
    return Array.from(this.tools.values()).map(t => ({ name: t.name, description: t.description }));
  }
}

export const toolRegistry = new ToolRegistry();
