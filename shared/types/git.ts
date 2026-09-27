export type GitFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflicted';

export type GitFileChange = {
  path: string;
  relativePath: string;
  status: GitFileStatus;
  staged: boolean;
};

export type GitBranch = {
  name: string;
  isCurrent: boolean;
};

export type GitStatus = {
  isRepository: boolean;
  currentBranch: string | null;
  changes: GitFileChange[];
  remote: string | null;
};
