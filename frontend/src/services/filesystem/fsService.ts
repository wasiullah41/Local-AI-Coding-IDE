import { apiService } from '../api/apiService';
import { FileEntry } from '@local-ide/shared';

export const fsService = {
  readDirectory: async (path?: string): Promise<FileEntry[]> => {
    const response = await apiService.get('/fs/directory', { params: { path } });
    return response.data.data;
  },
  readFile: async (path: string): Promise<{ content: string; language: string }> => {
    const response = await apiService.get('/fs/file', { params: { path } });
    return response.data.data;
  },
  writeFile: async (path: string, content: string): Promise<void> => {
    await apiService.put('/fs/file', { path, content });
  },
  createFile: async (path: string): Promise<void> => {
    await apiService.post('/fs/file', { path });
  },
  createDirectory: async (path: string): Promise<void> => {
    await apiService.post('/fs/directory', { path });
  },
  rename: async (oldPath: string, newPath: string): Promise<void> => {
    await apiService.put('/fs/rename', { oldPath, newPath });
  },
  delete: async (path: string): Promise<void> => {
    await apiService.delete('/fs/delete', { data: { path } });
  }
};
