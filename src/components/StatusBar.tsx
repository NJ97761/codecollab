import { useFileSystem } from './FileSystemContext';
import { Circle, Loader2, Users, MessageSquare } from 'lucide-react';

export function StatusBar() {
  const { state, getActiveFile } = useFileSystem();
  const activeFile = getActiveFile();

  const getLineCount = (content: string) => content.split('\n').length;
  const getCharCount = (content: string) => content.length;

  const connectionIcons = {
    connected: <Circle size={7} className="text-emerald-400 fill-emerald-400" />,
    connecting: <Loader2 size={10} className="text-amber-400 animate-spin" />,
    disconnected: <Circle size={7} className="text-red-400 fill-red-400" />,
  };

  const connectionLabels = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  };

  const usersCount = state.room?.users.length || 0;
  const commentsCount = state.room?.comments.filter((c) => !c.resolved).length || 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-800/50 px-4 py-1 flex items-center justify-between text-[11px] text-slate-500">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {connectionIcons[state.connectionStatus]}
          <span>{connectionLabels[state.connectionStatus]}</span>
        </div>

        {state.room && (
          <>
            <span className="text-slate-700">│</span>
            <div className="flex items-center gap-1">
              <Users size={10} />
              <span>{usersCount} online</span>
            </div>
            <span className="text-slate-700">│</span>
            <div className="flex items-center gap-1">
              <MessageSquare size={10} />
              <span>{commentsCount} comments</span>
            </div>
          </>
        )}

        {activeFile && (
          <>
            <span className="text-slate-700">│</span>
            <span>{activeFile.name}</span>
            <span className="text-slate-700">│</span>
            <span className="uppercase text-[10px] tracking-wide">{activeFile.language}</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {activeFile && (
          <>
            <span>Ln {getLineCount(activeFile.content)}</span>
            <span>Ch {getCharCount(activeFile.content)}</span>
          </>
        )}
        {state.room && (
          <>
            <span className="text-slate-700">│</span>
            <span className="font-mono text-indigo-400/60">{state.room.id}</span>
          </>
        )}
      </div>
    </div>
  );
}
