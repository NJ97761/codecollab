import { User } from '../types';
import { Crown } from 'lucide-react';

export function UserPresence({ users }: { users: User[] }) {
    if (users.length === 0) return null;

    const displayed = users.slice(0, 5);
    const overflow = users.length - 5;

    return (
        <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
                {displayed.map((user) => (
                    <div
                        key={user.id}
                        className="relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-slate-950 cursor-default transition-transform hover:scale-110 hover:z-10"
                        style={{ backgroundColor: user.color }}
                        title={`${user.name} (${user.role})`}
                    >
                        {user.name[0]?.toUpperCase()}
                        {user.role === 'owner' && (
                            <span className="absolute -top-1 -right-1 text-amber-300 drop-shadow-sm">
                                <Crown size={9} fill="currentColor" />
                            </span>
                        )}
                    </div>
                ))}
                {overflow > 0 && (
                    <div className="relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-slate-300 bg-slate-700 ring-2 ring-slate-950">
                        +{overflow}
                    </div>
                )}
            </div>
            <span className="text-xs text-slate-500 ml-2">
                {users.length} online
            </span>
        </div>
    );
}
