import { useState } from 'react';
import { FileText, Plus, Trash2, Folder, MessageSquare } from 'lucide-react';
import { useFileSystem } from './FileSystemContext';

export function FileExplorer() {
  const { state, createFile, deleteFile, setActiveFile, isViewer } = useFileSystem();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const files = state.room?.files || [];
  const comments = state.room?.comments || [];

  const getFileCommentCount = (fileId: string) => {
    return comments.filter((c) => c.fileId === fileId && !c.resolved).length;
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const extension = newFileName.split('.').pop() || 'txt';
      const languageMap: Record<string, string> = {
        js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
        html: 'html', css: 'css', json: 'json', md: 'markdown',
        py: 'python', java: 'java', cpp: 'cpp', c: 'c',
        go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
        sql: 'sql', yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell',
      };
      const language = languageMap[extension] || 'plaintext';
      createFile(newFileName, language);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateFile();
    else if (e.key === 'Escape') { setIsCreating(false); setNewFileName(''); }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const colorMap: Record<string, string> = {
      js: 'text-yellow-400', ts: 'text-blue-400', jsx: 'text-cyan-400', tsx: 'text-cyan-400',
      html: 'text-orange-400', css: 'text-purple-400', json: 'text-green-400',
      md: 'text-slate-400', py: 'text-green-500', java: 'text-red-400',
    };
    return colorMap[ext || ''] || 'text-slate-400';
  };

  return (
    <div className="w-60 bg-slate-900/95 backdrop-blur-sm text-slate-200 flex flex-col h-full border-r border-slate-800/50">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder size={15} className="text-indigo-400" />
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-400">Explorer</h2>
        </div>
        {/* Hide New File button for viewers */}
        {!isViewer && (
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-slate-800 rounded-md transition-colors"
            title="New File"
          >
            <Plus size={14} className="text-slate-400 hover:text-slate-200" />
          </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {/* New File Input */}
        {isCreating && !isViewer && (
          <div className="px-2 py-1.5">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (newFileName.trim()) handleCreateFile();
                else { setIsCreating(false); setNewFileName(''); }
              }}
              placeholder="filename.ext"
              className="w-full px-2.5 py-1.5 bg-slate-800/80 border border-indigo-500/50 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/30 text-white placeholder-slate-500"
              autoFocus
            />
          </div>
        )}

        {files.map((file) => {
          const commentCount = getFileCommentCount(file.id);
          return (
            <div
              key={file.id}
              className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer transition-all duration-150 ${state.activeFileId === file.id
                  ? 'bg-slate-800/70 text-white border-l-2 border-indigo-500'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-l-2 border-transparent'
                }`}
              onClick={() => setActiveFile(file.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={14} className={`flex-shrink-0 ${getFileIcon(file.name)}`} />
                <span className="text-xs truncate">{file.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {commentCount > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px]">
                    <MessageSquare size={8} />
                    {commentCount}
                  </span>
                )}
                {/* Hide delete button for viewers */}
                {!isViewer && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${file.name}?`)) deleteFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    title="Delete File"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {files.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-600">No files yet</p>
            {!isViewer && (
              <button
                onClick={() => setIsCreating(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
              >
                Create one
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
