import { Loader2 } from 'lucide-react';
import { FileSystemProvider, useFileSystem } from './contexts/FileSystemContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { CommentPanel } from './components/CommentPanel';
import { StatusBar } from './components/StatusBar';
import { useState } from 'react';

function EditorView() {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <Header
        onToggleComments={() => setIsCommentsOpen(!isCommentsOpen)}
        isCommentsOpen={isCommentsOpen}
      />
      <div className="flex-1 flex overflow-hidden">
        <FileExplorer />
        <CodeEditor />
        <CommentPanel isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} />
      </div>
      <StatusBar />
    </div>
  );
}

function AppContent() {
  const { authUser, authLoading } = useAuth();
  const { state } = useFileSystem();

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-indigo-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authUser) return <AuthPage />;
  if (!state.room) return <Dashboard />;
  return <EditorView />;
}

function App() {
  return (
    <AuthProvider>
      <FileSystemProvider>
        <AppContent />
      </FileSystemProvider>
    </AuthProvider>
  );
}

export default App;
