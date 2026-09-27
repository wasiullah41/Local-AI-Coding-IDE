import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useEditorStore } from '../../stores/editorStore';

export const MonacoEditor: React.FC = () => {
  const { tabs, activeTabPath, updateContent, pendingNavigation, clearPendingNavigation } = useEditorStore();
  const { settings } = useSettingsStore();

  const activeTab = tabs.find(t => t.path === activeTabPath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.editor.fontSize,
        fontFamily: settings.editor.fontFamily,
        tabSize: settings.editor.tabSize,
        insertSpaces: settings.editor.insertSpaces,
        wordWrap: settings.editor.wordWrap,
        minimap: { enabled: settings.editor.minimap },
        lineNumbers: settings.editor.lineNumbers,
        renderWhitespace: settings.editor.renderWhitespace,
      });
    }
  }, [settings.editor]);

  useEffect(() => {
    if (editorRef.current && pendingNavigation) {
      const { line, column } = pendingNavigation;

      editorRef.current.revealPositionInCenter({ lineNumber: line, column });
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.setSelection({
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 10, // Highlight approximate match length
      });
      editorRef.current.focus();

      clearPendingNavigation();
    }
  }, [pendingNavigation, clearPendingNavigation]);

  if (!activeTab) return <div className="h-full flex items-center justify-center text-gray-500">No file open</div>;

  return (
    <Editor
      height="100%"
      path={activeTab.path}
      defaultLanguage={activeTab.language}
      defaultValue={activeTab.content}
      value={activeTab.content}
      onChange={(value) => updateContent(activeTab.path, value || '')}
      onMount={handleEditorDidMount}
      theme={settings.appearance.theme === 'dark' ? 'vs-dark' : 'vs-light'}
      options={{
        fontSize: settings.editor.fontSize,
        fontFamily: settings.editor.fontFamily,
        tabSize: settings.editor.tabSize,
        insertSpaces: settings.editor.insertSpaces,
        wordWrap: settings.editor.wordWrap,
        minimap: { enabled: settings.editor.minimap },
        lineNumbers: settings.editor.lineNumbers,
        renderWhitespace: settings.editor.renderWhitespace,
      }}
    />
  );
};
