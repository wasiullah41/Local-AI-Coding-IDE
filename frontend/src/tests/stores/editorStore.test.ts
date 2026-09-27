import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../../stores/editorStore';

// Mock the filesystem service
vi.mock('../../services/filesystem/fsService', () => ({
  fsService: {
    readFile: vi.fn().mockResolvedValue({
      content: 'mocked content',
      language: 'plaintext',
    }),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('EditorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditorStore.setState({
      tabs: [],
      activeTabPath: null,
      pendingNavigation: null,
    });
  });

  it('should initialize with empty tabs', () => {
    const state = useEditorStore.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTabPath).toBeNull();
  });

  it('should add a tab manually', () => {
    // Manually add tab to test state management
    useEditorStore.setState({
      tabs: [{
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'hello world',
        language: 'plaintext',
        isDirty: false,
      }],
      activeTabPath: '/test/file.txt',
    });

    const state = useEditorStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].path).toBe('/test/file.txt');
    expect(state.tabs[0].content).toBe('hello world');
    expect(state.activeTabPath).toBe('/test/file.txt');
  });

  it('should close a tab', () => {
    // Setup initial state
    useEditorStore.setState({
      tabs: [{
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'content',
        language: 'plaintext',
        isDirty: false,
      }],
      activeTabPath: '/test/file.txt',
    });

    const { closeTab } = useEditorStore.getState();
    closeTab('/test/file.txt');

    const state = useEditorStore.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeTabPath).toBeNull();
  });

  it('should update content and mark tab as dirty', () => {
    // Setup initial state
    useEditorStore.setState({
      tabs: [{
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'original',
        language: 'plaintext',
        isDirty: false,
      }],
      activeTabPath: '/test/file.txt',
    });

    const { updateContent } = useEditorStore.getState();
    updateContent('/test/file.txt', 'modified');

    const state = useEditorStore.getState();
    expect(state.tabs[0].content).toBe('modified');
    expect(state.tabs[0].isDirty).toBe(true);
  });

  it('should switch active tab', () => {
    // Setup initial state with multiple tabs
    useEditorStore.setState({
      tabs: [
        {
          path: '/test/file1.txt',
          name: 'file1.txt',
          content: 'content1',
          language: 'plaintext',
          isDirty: false,
        },
        {
          path: '/test/file2.txt',
          name: 'file2.txt',
          content: 'content2',
          language: 'plaintext',
          isDirty: false,
        }
      ],
      activeTabPath: '/test/file2.txt',
    });

    const { setActiveTab } = useEditorStore.getState();
    setActiveTab('/test/file1.txt');

    const state = useEditorStore.getState();
    expect(state.activeTabPath).toBe('/test/file1.txt');
  });

  it('should clear pending navigation', () => {
    useEditorStore.setState({
      pendingNavigation: { line: 10, column: 5 },
    });

    const { clearPendingNavigation } = useEditorStore.getState();
    clearPendingNavigation();

    const state = useEditorStore.getState();
    expect(state.pendingNavigation).toBeNull();
  });
});
