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
export declare const defaultSettings: WorkspaceSettings;
