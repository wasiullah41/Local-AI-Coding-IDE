export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
  lastOpenedAt: string;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: string;
}

export interface WorkspaceState {
  activeWorkspace: Workspace | null;
  recentWorkspaces: RecentWorkspace[];
  openFiles: string[];
  activeFile: string | null;
}
