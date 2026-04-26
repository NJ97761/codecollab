import { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useAuth } from '../contexts/AuthContext';
import { RoomSummary } from '../types';
import {
  Plus, ArrowRight, Loader2, LogOut, Trash2, Clock, Code2,
  FolderOpen, Sparkles, Zap, FileCode,
} from 'lucide-react';

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨', ext: 'js' },
  { value: 'typescript', label: 'TypeScript', icon: '🟦', ext: 'ts' },
  { value: 'python', label: 'Python', icon: '🐍', ext: 'py' },
  { value: 'html', label: 'HTML / CSS', icon: '🌐', ext: 'html' },
  { value: 'java', label: 'Java', icon: '☕', ext: 'java' },
  { value: 'cpp', label: 'C++', icon: '⚙️', ext: 'cpp' },
  { value: 'c', label: 'C', icon: '🔧', ext: 'c' },
  { value: 'go', label: 'Go', icon: '🐹', ext: 'go' },
  { value: 'rust', label: 'Rust', icon: '🦀', ext: 'rs' },
  { value: 'ruby', label: 'Ruby', icon: '💎', ext: 'rb' },
  { value: 'php', label: 'PHP', icon: '🐘', ext: 'php' },
  { value: 'sql', label: 'SQL', icon: '🗄️', ext: 'sql' },
];

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  typescript: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  python: 'from-green-500/20 to-green-600/10 border-green-500/30',
  html: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  java: 'from-red-500/20 to-red-600/10 border-red-500/30',
  cpp: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  c: 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
  go: 'from-sky-500/20 to-sky-600/10 border-sky-500/30',
  rust: 'from-orange-600/20 to-orange-700/10 border-orange-600/30',
  ruby: 'from-red-400/20 to-red-500/10 border-red-400/30',
  php: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  sql: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
};

function getLangIcon(lang: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.value === lang)?.icon || '📄';
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const { createRoom, joinRoom, fetchUserRooms, deleteRoom } = useFileSystem();
  const { authUser, signOut } = useAuth();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create project form
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectLang, setProjectLang] = useState('javascript');

  const displayName = authUser?.displayName || authUser?.email?.split('@')[0] || 'User';

  // Fetch user's rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await fetchUserRooms();
      setRooms(data);
    } catch {
      console.warn('Failed to load rooms');
    }
    setLoadingRooms(false);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createRoom(displayName, projectName.trim(), projectLang);
    } catch {
      setError('Failed to create project. Is the server running?');
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinRoom(roomId.trim(), displayName);
    } catch {
      setError('Failed to join room. Check the ID and try again.');
      setLoading(false);
    }
  };

  const handleOpenProject = async (rid: string) => {
    setLoading(true);
    setError('');
    try {
      await joinRoom(rid, displayName);
    } catch {
      setError('Failed to open project.');
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (rid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project permanently?')) return;
    try {
      await deleteRoom(rid);
      setRooms((prev) => prev.filter((r) => r.id !== rid));
    } catch {
      setError('Failed to delete project.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center">
              <img src="/codelogo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Welcome back, {displayName}
              </h1>
              <p className="text-slate-500 text-sm">Your collaborative workspace</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>

        {/* Action Row */}
        <div className="flex gap-3 mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            New Project
          </button>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <input
              type="text"
              value={roomId}
              onChange={(e) => { setRoomId(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="Enter room ID to join..."
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all"
            />
            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl font-medium text-sm bg-slate-800 border border-slate-700/50 text-slate-200 hover:bg-slate-700 transition-all flex items-center gap-1.5"
            >
              <ArrowRight size={14} />
              Join
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Create Project Panel */}
        {showCreate && (
          <div className="mb-8 p-6 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" />
              Create New Project
            </h3>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => { setProjectName(e.target.value); setError(''); }}
                placeholder="My Awesome Project"
                className="w-full max-w-md px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm text-slate-400 mb-3">Programming Language</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setProjectLang(lang.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
                      projectLang === lang.value
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 scale-105 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xl">{lang.icon}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Create Project
            </button>
          </div>
        )}

        {/* My Projects */}
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <FolderOpen size={18} className="text-indigo-400" />
            My Projects
          </h2>

          {loadingRooms ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <FileCode size={48} className="mb-4 opacity-20" />
              <p className="text-base">No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const langColor = LANGUAGE_COLORS[room.language] || LANGUAGE_COLORS.javascript;
                const isOwner = room.ownerId === authUser?.uid;
                return (
                  <div
                    key={room.id}
                    onClick={() => handleOpenProject(room.id)}
                    className={`group relative p-5 rounded-2xl bg-gradient-to-br ${langColor} border backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]`}
                  >
                    {/* Delete button (owner only) */}
                    {isOwner && (
                      <button
                        onClick={(e) => handleDeleteRoom(room.id, e)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                        title="Delete project"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    )}

                    {/* Language icon */}
                    <div className="text-2xl mb-3">{getLangIcon(room.language)}</div>

                    {/* Name */}
                    <h3 className="text-base font-semibold text-white mb-1 truncate">
                      {room.name || `Room ${room.id}`}
                    </h3>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-3">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(room.lastModifiedAt || room.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Code2 size={11} />
                        {room.fileCount || 0} files
                      </span>
                    </div>

                    {/* Room ID */}
                    <div className="mt-3 flex items-center justify-between">
                      <code className="text-[10px] text-slate-500 font-mono">{room.id}</code>
                      {isOwner && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 font-medium">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
