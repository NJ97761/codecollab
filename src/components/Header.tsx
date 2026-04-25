import { useState } from 'react';
import { LogOut, Copy, Check, MessageSquare, Users, Crown, Edit3, Eye } from 'lucide-react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useAuth } from '../contexts/AuthContext';
import { UserPresence } from './UserPresence';
import { ParticipantsPanel } from './ParticipantsPanel';

export function Header({ onToggleComments, isCommentsOpen }: { onToggleComments: () => void; isCommentsOpen: boolean }) {
  const { state, leaveRoom, isOwner, isViewer } = useFileSystem();
  const { signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  const roomId = state.room?.id || '';
  const users = state.room?.users || [];
  const commentCount = state.room?.comments.filter((c) => !c.resolved).length || 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = () => {
    leaveRoom();
  };

  const handleSignOut = async () => {
    leaveRoom();
    await signOut();
  };

  const roleBadge = isOwner
    ? { label: 'Owner', icon: <Crown size={11} />, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
    : isViewer
    ? { label: 'Viewer', icon: <Eye size={11} />, cls: 'bg-slate-700/50 text-slate-300 border-slate-600/30' }
    : { label: 'Editor', icon: <Edit3 size={11} />, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };

  return (
    <header className="bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50 px-5 py-2.5 flex items-center justify-between relative z-20">
      {/* Left: Logo + Room */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <img src="/codelogo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            CodeSphere
          </h1>
        </div>

        {/* Room ID */}
        {roomId && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-slate-500">Room:</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all text-xs group"
            >
              <code className="text-indigo-400 font-mono">{roomId}</code>
              {copied ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              )}
            </button>
          </div>
        )}

        {/* Current user role badge */}
        {state.currentUser && (
          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${roleBadge.cls}`}>
            {roleBadge.icon}
            {roleBadge.label}
          </span>
        )}
      </div>

      {/* Right: Users + Actions */}
      <div className="flex items-center gap-3 relative">
        <UserPresence users={users} />

        <div className="w-px h-6 bg-slate-800" />

        {/* Participants Button */}
        {state.room && (
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isParticipantsOpen
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent'
              }`}
          >
            <Users size={14} />
            <span>Participants</span>
          </button>
        )}

        {/* Comments Toggle */}
        <button
          onClick={onToggleComments}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isCommentsOpen
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
        >
          <MessageSquare size={14} />
          <span>Comments</span>
          {commentCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-purple-500 text-[10px] text-white flex items-center justify-center font-bold">
              {commentCount}
            </span>
          )}
        </button>

        {/* Leave Room */}
        {state.room && (
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent hover:border-slate-700/50 transition-all"
          >
            Leave
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>

        {/* Participants Panel */}
        <ParticipantsPanel
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
        />
      </div>
    </header>
  );
}
