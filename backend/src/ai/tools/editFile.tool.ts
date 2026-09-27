import { AITool, AIToolResult } from './toolTypes';
import { filesystemService } from '../../services/filesystem/filesystem.service';

export const editFileTool: AITool = {
  name: 'edit_file',
  description: 'Edit the content of an existing file by replacing old text with new text.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file' },
      oldText: { type: 'string', description: 'The text to be replaced' },
      newText: { type: 'string', description: 'The new text' },
    },
    required: ['path', 'oldText', 'newText'],
  },
  execute: async (args): Promise<AIToolResult> => {
    const { path, oldText, newText } = args as { path: string; oldText: string; newText: string };
    try {
      // 1. Read the file
      const fileData = await filesystemService.readFile(path);
      const content = fileData.content;

      // 2. Verify oldText exists
      const occurrences = content.split(oldText).length - 1;
      if (occurrences === 0) {
        return { success: false, error: `Text not found: ${oldText}` };
      }
      if (occurrences > 1) {
        return { success: false, error: `Multiple occurrences of text found: ${oldText}` };
      }

      // 3. Apply replacement
      const newContent = content.replace(oldText, newText);

      // 4. Write back
      await filesystemService.writeFile(path, newContent);

      return {
        success: true,
        changeSummary: `Updated ${path}: replaced "${oldText}" with "${newText}"`,
        data: { path, originalContent: content, newContent },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to edit file' };
    }
  },
};
