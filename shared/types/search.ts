export type SearchOptions = {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
};

export type SearchRequest = {
  query: string;
  workspaceRoot: string;
} & SearchOptions;

export type SearchMatch = {
  line: number;
  column: number;
  matchLength: number;
  lineText: string;
};

export type SearchFileResult = {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
};

export type SearchResult = {
  totalMatches: number;
  files: SearchFileResult[];
  limitReached: boolean;
};
