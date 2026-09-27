export interface FileEntry {
    name: string;
    path: string;
    relativePath: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: string;
    extension?: string;
    children?: FileEntry[];
    isExpanded?: boolean;
}
export interface FileContent {
    path: string;
    content: string;
    encoding: string;
    language: string;
    size: number;
    modifiedAt: string;
}
export interface FileOperation {
    type: 'create' | 'rename' | 'delete' | 'move' | 'copy';
    sourcePath: string;
    targetPath?: string;
    isDirectory?: boolean;
    content?: string;
}
export interface FileWatchEvent {
    type: 'created' | 'modified' | 'deleted' | 'renamed';
    path: string;
    oldPath?: string;
    isDirectory: boolean;
}
