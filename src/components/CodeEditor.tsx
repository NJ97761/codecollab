import { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { FileText, Eye } from 'lucide-react';
import type { editor } from 'monaco-editor';

export function CodeEditor() {
  const { state, getActiveFile, updateFileContent, updateCursor, setActiveFile, isViewer } = useFileSystem();
  const activeFile = getActiveFile();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteChangeRef = useRef(false);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      if (activeFile) {
        updateCursor(activeFile.id, {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (isRemoteChangeRef.current) return;
      if (isViewer) return; // extra client-side guard
      if (activeFile) {
        updateFileContent(activeFile.id, value || '');
      }
    },
    [activeFile, updateFileContent, isViewer]
  );

  // Update editor value when remote changes come in
  useEffect(() => {
    if (!editorRef.current || !activeFile) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const currentValue = model.getValue();
    if (currentValue !== activeFile.content) {
      isRemoteChangeRef.current = true;
      const position = editorRef.current.getPosition();
      model.setValue(activeFile.content);
      if (position) {
        editorRef.current.setPosition(position);
      }
      isRemoteChangeRef.current = false;
    }
  }, [activeFile?.content]);

  // Render remote cursors as decorations
  useEffect(() => {
    if (!editorRef.current || !activeFile) return;

    const remoteCursorsForFile = state.remoteCursors.filter(
      (c) => c.fileId === activeFile.id && c.userId !== state.currentUser?.id
    );

    const newDecorations = remoteCursorsForFile.map((cursor) => ({
      range: {
        startLineNumber: cursor.position.lineNumber,
        startColumn: cursor.position.column,
        endLineNumber: cursor.position.lineNumber,
        endColumn: cursor.position.column + 1,
      },
      options: {
        className: 'remote-cursor',
        beforeContentClassName: 'remote-cursor-before',
        hoverMessage: { value: cursor.userName },
        stickiness: 1 as editor.TrackedRangeStickiness,
        afterContentClassName: `remote-cursor-label`,
      },
    }));

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [state.remoteCursors, activeFile?.id, state.currentUser?.id]);

  // Show comments as line decorations
  useEffect(() => {
    if (!editorRef.current || !activeFile || !state.room) return;

    const fileComments = state.room.comments.filter(
      (c) => c.fileId === activeFile.id && !c.resolved
    );

    const commentDecorations = fileComments.map((comment) => ({
      range: {
        startLineNumber: comment.lineNumber,
        startColumn: 1,
        endLineNumber: comment.lineNumber,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        linesDecorationsClassName: 'comment-line-decoration',
        glyphMarginClassName: 'comment-glyph-margin',
        glyphMarginHoverMessage: { value: `💬 ${comment.author}: ${comment.text}` },
      },
    }));

    editorRef.current.deltaDecorations([], commentDecorations);
  }, [state.room?.comments, activeFile?.id]);

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="opacity-30" />
          </div>
          <p className="text-base text-slate-500">No file selected</p>
          <p className="text-xs mt-2 text-slate-600">Create or select a file to start coding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-w-0">
      {/* File tab bar */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50 px-1 flex items-center h-9 overflow-x-auto custom-scrollbar-horizontal">
        {state.room?.files.map((file) => (
          <button
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${state.activeFileId === file.id
              ? 'text-slate-200 border-indigo-500 bg-slate-800/50'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
              }`}
          >
            <FileText size={12} />
            {file.name}
          </button>
        ))}

        {/* View-only badge */}
        {isViewer && (
          <div className="ml-auto mr-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs">
            <Eye size={12} className="text-slate-500" />
            View only
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={activeFile.language}
          value={activeFile.content}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            glyphMargin: true,
            lineDecorationsWidth: 5,
            readOnly: isViewer,       // 👈 enforce read-only for viewers
            domReadOnly: isViewer,
          }}
        />
      </div>
    </div>
  );
}
