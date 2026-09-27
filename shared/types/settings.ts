export type WorkspaceSettings = {
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: 'off' | 'on' | 'wordWrapColumn';
    minimap: boolean;
    lineNumbers: 'on' | 'off' | 'relative';
    renderWhitespace: 'none' | 'boundary' | 'all' | 'selection';
  };
  appearance: {
    theme: 'dark' | 'light' | 'high-contrast';
    activityBarVisible: boolean;
    statusBarVisible: boolean;
    panelVisible: boolean;
  };
  files: {
    autoSave: boolean;
  };
  terminal: {
    fontSize: number;
  };
  extensions: {
    autoActivate: boolean;
  };
};

export const defaultSettings: WorkspaceSettings = {
  editor: {
    fontSize: 14,
    fontFamily: 'Consolas',
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: 'on',
    renderWhitespace: 'none',
  },
  appearance: {
    theme: 'dark',
    activityBarVisible: true,
    statusBarVisible: true,
    panelVisible: true,
  },
  files: {
    autoSave: false,
  },
  terminal: {
    fontSize: 13,
  },
  extensions: {
    autoActivate: true,
  },
};
