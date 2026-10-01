// WebSocket event names
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_EXIT: 'terminal:exit',

  // File system
  FS_CHANGE: 'fs:change',
  FS_CREATED: 'fs:created',
  FS_MODIFIED: 'fs:modified',
  FS_DELETED: 'fs:deleted',
  FS_RENAMED: 'fs:renamed',

  // Git
  GIT_STATUS_CHANGED: 'git:statusChanged',
  GIT_BRANCH_CHANGED: 'git:branchChanged',

  // Search
  SEARCH_RESULT: 'search:result',
  SEARCH_COMPLETE: 'search:complete',
  SEARCH_ERROR: 'search:error',

  // AI coding agent
  AGENT_EVENT: 'agent:event',
  AGENT_TASK_STATUS: 'agent:task_status',
  AI_MESSAGE: 'ai:message',
  AI_TOOL_CALL: 'ai:toolCall',
  AI_TOOL_RESULT: 'ai:toolResult',
  AI_STATUS: 'ai:status',
  AI_ERROR: 'ai:error',
} as const;

export type WSEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];
