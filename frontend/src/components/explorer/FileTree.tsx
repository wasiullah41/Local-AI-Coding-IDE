import React from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { FileEntry } from '@local-ide/shared';
import { useExplorerStore } from '../../stores/explorerStore';
import { useEditorStore } from '../../stores/editorStore';

interface FileTreeItemProps {
  entry: FileEntry;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ entry }) => {
  const { expandedFolders, toggleFolder } = useExplorerStore();
  const { openFile } = useEditorStore();
  const isExpanded = expandedFolders.has(entry.path);

  const handleClick = async () => {
    if (entry.type === 'directory') {
      toggleFolder(entry.path);
    } else {
      await openFile(entry.path);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={('flex items-center hover:bg-gray-800 py-1 cursor-pointer ' + (entry.type === 'file' ? 'ml-4 pl-2' : ''))} 
        onClick={handleClick}
      >
        {entry.type === 'directory' && (
          isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        )}
        {entry.type === 'directory' ? 
          <Folder size={16} className="text-blue-400 mr-2" /> :
          <File size={16} className="text-gray-400 mr-2" />
        }
        {entry.name}
      </div>
      {entry.type === 'directory' && isExpanded && entry.children && (
        <div className="ml-4">
          {entry.children.map(child => <FileTreeItem key={child.path} entry={child} />)}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC = () => {
  const { rootFiles, loadRootFiles } = useExplorerStore();

  React.useEffect(() => {
    loadRootFiles();
  }, [loadRootFiles]);

  return (
    <div className="text-sm p-2">
      {rootFiles.map(entry => <FileTreeItem key={entry.path} entry={entry} />)}
    </div>
  );
};
