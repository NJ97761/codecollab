import { useState } from 'react';
import { Users, Crown, Eye, Edit3, ChevronDown, X } from 'lucide-react';
import { useFileSystem } from './FileSystemContext';
import { UserRole } from '../types';

export function ParticipantsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, isOwner, changeUserRole } = useFileSystem();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  if (!isOpen || !state.room) return null;

  const users = state.room.users;
  const currentUserId = state.currentUser?.id;

  const roleConfig: Record<UserRole, { label: string; color: string; bg: string; icon: JSX.Element }> = {
    owner: {
      label: 'Owner',
      color: 'text-amber-300',
      bg: 'bg-amber-500/15 border-amber-500/30',
      icon: <Crown size={11} />,
    },
    editor: {
      label: 'Editor',
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      icon: <Edit3 size={11} />,
    },
    viewer: {
      label: 'Viewer',
      color: 'text-slate-300',
      bg: 'bg-slate-700/50 border-slate-600/30',
      icon: <Eye size={11} />,
    },
  };

  const handleRoleChange = (targetUserId: string, newRole: UserRole) => {
    changeUserRole(targetUserId, newRole);
    setOpenDropdownId(null);
  };

  return (
    <div className="absolute top-12 right-4 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-indigo-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Participants</h3>
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
            {users.length}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      {/* User list */}
      <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
        {users.map((user) => {
          const cfg = roleConfig[user.role] || roleConfig.viewer;
          const isMe = user.id === currentUserId;
          const canChange = isOwner && !isMe && user.role !== 'owner';

          return (
            <div
              key={user.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name[0]?.toUpperCase()}
                  {user.role === 'owner' && (
                    <span className="absolute -top-1 -right-1 text-amber-300 drop-shadow">
                      <Crown size={10} fill="currentColor" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {user.name}
                    {isMe && <span className="ml-1.5 text-xs text-slate-500">(you)</span>}
                  </p>
                </div>
              </div>

              {/* Role badge or dropdown */}
              {canChange ? (
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all hover:brightness-110 ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.icon}
                    {cfg.label}
                    <ChevronDown size={10} />
                  </button>

                  {openDropdownId === user.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl z-50 overflow-hidden">
                      {(['editor', 'viewer'] as UserRole[]).map((r) => {
                        const rc = roleConfig[r];
                        return (
                          <button
                            key={r}
                            onClick={() => handleRoleChange(user.id, r)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-700 transition-colors ${rc.color} ${user.role === r ? 'opacity-50 cursor-default' : ''}`}
                          >
                            {rc.icon}
                            Make {rc.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                  {cfg.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isOwner && (
        <div className="px-4 py-2.5 border-t border-slate-700/50 bg-slate-800/30">
          <p className="text-[11px] text-slate-500">
            👑 As the owner, you can change participants' roles.
          </p>
        </div>
      )}
    </div>
  );
}
