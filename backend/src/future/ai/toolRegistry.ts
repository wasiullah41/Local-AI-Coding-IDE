// Future AI Tool Registry - NOT implemented yet
import { AITool, AIToolResult } from './toolTypes';

export class ToolRegistry {
  private tools: Map<string, AITool> = new Map();

  register(tool: AITool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getAll(): AITool[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, args: Record<string, unknown>): Promise<AIToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool '${name}' not found` };
    }
    return tool.execute(args);
  }

  listNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Singleton - to be initialized when AI module is implemented
export const toolRegistry = new ToolRegistry();
