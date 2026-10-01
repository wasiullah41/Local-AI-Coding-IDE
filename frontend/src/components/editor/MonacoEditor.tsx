import React, { useEffect, useMemo, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
// Imported for its side effect: registers the local Monaco build with the loader
// before this component mounts the editor. This module is only reached through a
// lazy import from EditorArea, keeping the language workers out of app startup.
import { applyMonacoTheme } from '../../editor/monacoSetup';
import { useSettingsStore } from '../../stores/settingsStore';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export const MonacoEditor: React.FC = () => {
  const { tabs, activeTabPath, updateContent, pendingNavigation, clearPendingNavigation } =
    useEditorStore();
  const { settings } = useSettingsStore();
  const setError = useWorkspaceStore((s) => s.setError);

  const activeTab = tabs.find((t) => t.path === activeTabPath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  const isDark = settings.appearance.theme !== 'light';

  // Monaco must re-read the CSS variables after the app theme changes.
  useEffect(() => {
    applyMonacoTheme(isDark);
  }, [isDark]);

  const options = useMemo(
    () => ({
      fontSize: settings.editor.fontSize,
      fontFamily: settings.editor.fontFamily,
      tabSize: settings.editor.tabSize,
      insertSpaces: settings.editor.insertSpaces,
      wordWrap: settings.editor.wordWrap,
      minimap: { enabled: settings.editor.minimap },
      lineNumbers: settings.editor.lineNumbers,
      renderWhitespace: settings.editor.renderWhitespace,
      automaticLayout: true,
      smoothScrolling: true,
      cursorBlinking: 'smooth' as const,
      padding: { top: 8, bottom: 8 },
      scrollBeyondLastLine: false,
      bracketPairColorization: { enabled: true },
    }),
    [settings.editor]
  );

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Ctrl+S saves the active tab, as expected everywhere.
    editor.addCommand(2048 | 49, async () => {
      const { activeTabPath: path, saveTab } = useEditorStore.getState();
      if (!path) return;
      try {
        await saveTab(path);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Save failed.');
      }
    });
  };

  useEffect(() => {
    editorRef.current?.updateOptions(options);
  }, [options]);

  useEffect(() => {
    if (editorRef.current && pendingNavigation) {
      const { line, column } = pendingNavigation;
      editorRef.current.revealPositionInCenter({ lineNumber: line, column });
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.setSelection({
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 10,
      });
      editorRef.current.focus();
      clearPendingNavigation();
    }
  }, [pendingNavigation, clearPendingNavigation]);

  if (!activeTab) return null;

  return (
    <Editor
      height="100%"
      path={activeTab.path}
      language={activeTab.language}
      value={activeTab.content}
      options={options}
      onChange={(value) => updateContent(activeTab.path, value ?? '')}
      onMount={handleEditorDidMount}
      loading={
        <div
          className="flex h-full items-center justify-center text-[12px]"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          Loading editor…
        </div>
      }
    />
  );
};

export default MonacoEditor;
