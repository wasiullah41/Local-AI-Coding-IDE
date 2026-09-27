import { extensionRegistry } from './extensionRegistry';

export interface ExtensionInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  category: string;
  enabled: boolean;
  builtin: boolean;
  languages?: string[];
  fileExtensions?: string[];
}

const BUILTIN_EXTENSIONS: ExtensionInfo[] = [
  {
    id: 'local-ide.javascript',
    name: 'javascript',
    displayName: 'JavaScript Language Support',
    description: 'Syntax highlighting, IntelliSense, and code navigation for JavaScript',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['javascript'],
    fileExtensions: ['.js', '.jsx', '.mjs', '.cjs'],
  },
  {
    id: 'local-ide.typescript',
    name: 'typescript',
    displayName: 'TypeScript Language Support',
    description: 'Syntax highlighting, IntelliSense, and code navigation for TypeScript',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['typescript'],
    fileExtensions: ['.ts', '.tsx'],
  },
  {
    id: 'local-ide.html',
    name: 'html',
    displayName: 'HTML Language Support',
    description: 'Syntax highlighting and tag completion for HTML',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['html'],
    fileExtensions: ['.html', '.htm'],
  },
  {
    id: 'local-ide.css',
    name: 'css',
    displayName: 'CSS Language Support',
    description: 'Syntax highlighting and property completion for CSS',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['css'],
    fileExtensions: ['.css', '.scss', '.less'],
  },
  {
    id: 'local-ide.json',
    name: 'json',
    displayName: 'JSON Language Support',
    description: 'Syntax highlighting and validation for JSON',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['json'],
    fileExtensions: ['.json', '.jsonc'],
  },
  {
    id: 'local-ide.markdown',
    name: 'markdown',
    displayName: 'Markdown Language Support',
    description: 'Syntax highlighting and preview for Markdown',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['markdown'],
    fileExtensions: ['.md', '.markdown'],
  },
  {
    id: 'local-ide.python',
    name: 'python',
    displayName: 'Python Language Support',
    description: 'Syntax highlighting for Python',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'language',
    enabled: true,
    builtin: true,
    languages: ['python'],
    fileExtensions: ['.py', '.pyw'],
  },
  {
    id: 'local-ide.git',
    name: 'git',
    displayName: 'Git Integration',
    description: 'Source control management with Git',
    version: '0.1.0',
    author: 'Local IDE',
    category: 'scm',
    enabled: true,
    builtin: true,
  },
];

export class ExtensionsService {
  private extensions: ExtensionInfo[] = [...BUILTIN_EXTENSIONS];

  getAll(): ExtensionInfo[] {
    const realExtensions = extensionRegistry.getAll().map(e => ({
      id: e.manifest.id,
      name: e.manifest.name,
      displayName: e.manifest.name,
      description: e.manifest.description,
      version: e.manifest.version,
      author: e.manifest.publisher,
      category: 'user',
      enabled: e.state === 'active',
      builtin: false
    }));
    return [...this.extensions, ...realExtensions];
  }

  getById(id: string): ExtensionInfo | undefined {
    return this.extensions.find(e => e.id === id);
  }

  getByCategory(category: string): ExtensionInfo[] {
    return this.extensions.filter(e => e.category === category);
  }

  getEnabled(): ExtensionInfo[] {
    return this.extensions.filter(e => e.enabled);
  }

  enable(id: string): boolean {
    const ext = this.extensions.find(e => e.id === id);
    if (ext) {
      ext.enabled = true;
      return true;
    }
    return false;
  }

  disable(id: string): boolean {
    const ext = this.extensions.find(e => e.id === id);
    if (ext && !ext.builtin) {
      ext.enabled = false;
      return true;
    }
    return false;
  }
}

export const extensionsService = new ExtensionsService();
