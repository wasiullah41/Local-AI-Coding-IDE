import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';

export const createFileTool: AITool = {
  name: 'create_file',
  description:
    'Create a new file in the workspace. Fails if the file already exists unless overwrite is true.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path for the new file, relative to the workspace root' },
      content: { type: 'string', description: 'Initial contents of the file' },
      overwrite: { type: 'boolean', description: 'Replace the file if it already exists' },
    },
    required: ['path', 'content'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path, content, overwrite } = args as {
      path: string;
      content: string;
      overwrite?: boolean;
    };

    try {
      if (overwrite) {
        await filesystemService.writeFile(path, content);
        return {
          success: true,
          changeSummary: `Overwrote ${path}`,
          data: { path, overwritten: true },
        };
      }

      await filesystemService.createFile(path, content);
      return {
        success: true,
        changeSummary: `Created ${path}`,
        data: { path, overwritten: false },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create file.';
      if (/already exists/i.test(message)) {
        return {
          success: false,
          error: `${path} already exists. Use edit_file to change it, or set overwrite: true.`,
        };
      }
      return { success: false, error: message };
    }
  },
};
