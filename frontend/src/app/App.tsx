import { useState, useEffect } from 'react';
import { apiService } from '../services/api/apiService';
import { FileTree } from '../components/explorer/FileTree';
import { MonacoEditor } from '../components/editor/MonacoEditor';
import { TabBar } from '../components/layout/TabBar';
import { useEditorStore } from '../stores/editorStore';
import { TerminalPanel } from '../components/terminal/TerminalPanel';
import { terminalClient } from '../services/terminal/terminalService';
import { SearchPanel } from '../components/search/SearchPanel';
import { SourceControlPanel } from '../components/sourceControl/SourceControlPanel';
import { ExtensionsPanel } from '../components/extensions/ExtensionsPanel';
import { StatusBar } from '../components/layout/StatusBar';
import { ThemeApplier } from '../themes/ThemeApplier';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { CommandPalette } from '../components/commandPalette/CommandPalette';
import { Search, Files, GitBranch, Puzzle, Settings, Bot } from 'lucide-react';
import { AIPanel } from '../components/ai/AIPanel';
import { aiWebSocketService } from '../services/api/aiWebSocketService';

// Define the electronAPI globally
declare global {
  interface Window {
    electronAPI: {
      openDirectory: () => Promise<string[]>;
    };
  }
}

export default function App() {
  const [workspace, setWorkspace] = useState<{ path: string; name: string } | null>(null);
  const { activeTabPath, saveTab } = useEditorStore();
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'extensions' | 'settings' | 'ai'>('explorer');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    terminalClient.connect();
    aiWebSocketService.connect();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setActiveView('search');
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenFolder = async () => {
    const paths = await window.electronAPI.openDirectory();
    if (paths && paths.length > 0) {
      const res = await apiService.post('/workspace/open', { path: paths[0] });
      setWorkspace(res.data.data);
    }
  };

  const handleSave = () => {
    if (activeTabPath) {
      saveTab(activeTabPath);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--color-background)] text-[var(--color-text)]">
      <ThemeApplier />
      <header className="h-8 bg-[var(--color-sidebar)] flex items-center px-4 text-xs select-none justify-between border-b border-[var(--color-border)]">
        <span>Local AI Coding IDE {workspace ? `- ${workspace.name}` : ''}</span>
        {activeTabPath && (
          <button className="bg-[var(--color-accent)] px-2 py-1 rounded hover:opacity-90" onClick={handleSave}>Save</button>
        )}
      </header>
      <main className="flex-1 flex overflow-hidden">
        <aside className="w-48 bg-[var(--color-sidebar)] flex flex-col border-r border-[var(--color-border)]">
          <div className="flex border-b border-[var(--color-border)]">
            <button className={`p-2 ${activeView === 'explorer' ? 'text-white bg-[var(--color-background)] border-r border-[var(--color-border)]' : 'text-gray-500 hover:text-white'}`}
              onClick={() => setActiveView('explorer')}><Files size={18} /></button>
            <button className={`p-2 ${activeView === 'search' ? 'text-white bg-[var(--color-background)] border-x border-[var(--color-border)]' : 'text-gray-500 hover:text-white'}`}
              onClick={() => setActiveView('search')}><Search size={18} /></button>
            <button className={`p-2 ${activeView === 'git' ? 'text-white bg-[var(--color-background)] border-x border-[var(--color-border)]' : 'text-gray-500 hover:text-white'}`}
              onClick={() => setActiveView('git')}><GitBranch size={18} /></button>
            <button className={`p-2 ${activeView === 'extensions' ? 'text-white bg-[var(--color-background)] border-x border-[var(--color-border)]' : 'text-gray-500 hover:text-white'}`}
              onClick={() => setActiveView('extensions')}><Puzzle size={18} /></button>
            <button className={`p-2 ${activeView === 'ai' ? 'text-white bg-[var(--color-background)] border-x border-[var(--color-border)]' : 'text-gray-500 hover:text-white'}`}
              onClick={() => setActiveView('ai')}><Bot size={18} /></button>
            <button className={`p-2 ${activeView === 'settings' ? 'text-white bg-[var(--color-background)] border-l border-[var(--color-border)]' : 'text-gray-500 hover:text-white'}`}
              onClick={() => setActiveView('settings')}><Settings size={18} /></button>
          </div>
          {activeView === 'explorer' && (
            <>
              <div className="p-2 text-xs text-gray-500 font-bold border-b border-[var(--color-border)]">EXPLORER</div>
              {workspace ? <FileTree /> : <button className="m-2 p-2 bg-[var(--color-accent)] rounded text-xs" onClick={handleOpenFolder}>Open Folder</button>}
            </>
          )}
          {activeView === 'search' && workspace && <SearchPanel workspaceRoot={workspace.path} />}
          {activeView === 'git' && workspace && <SourceControlPanel />}
          {activeView === 'extensions' && <ExtensionsPanel />}
          {activeView === 'ai' && workspace && <AIPanel workspaceRoot={workspace.path} />}
          {activeView === 'settings' && <SettingsPanel />}
        </aside>
        <section className="flex-1 flex flex-col overflow-hidden bg-[var(--color-editor-background)]">
          {activeTabPath ? (
            <>
              <TabBar />
              <div className="flex-1 overflow-hidden"><MonacoEditor /></div>
            </>
          ) : (
             <div className="h-full flex items-center justify-center text-gray-600">Select a file to open</div>
          )}
          <div className="h-40 bg-[var(--color-panel)] border-t border-[var(--color-border)]">
             {workspace && <TerminalPanel cwd={workspace.path} />}
          </div>
        </section>
      </main>
      <StatusBar />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}
