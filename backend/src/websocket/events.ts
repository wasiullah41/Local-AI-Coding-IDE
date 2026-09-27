export const WS_EVENTS = {
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_EXIT: 'terminal:exit',
  FS_CHANGE: 'fs:change',
  ERROR: 'error',
} as const;
