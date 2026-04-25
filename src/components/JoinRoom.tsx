import { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { ArrowRight, Plus, Loader2, Sparkles, Users, MessageSquare, Zap } from 'lucide-react';

export function JoinRoom() {
    const { createRoom, joinRoom } = useFileSystem();
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await createRoom(userName.trim());
        } catch {
            setError('Failed to create room. Is the server running?');
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await joinRoom(roomId.trim(), userName.trim());
        } catch {
            setError('Failed to join room. Check the room ID and try again.');
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (roomId.trim()) handleJoin();
            else handleCreate();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-slow animation-delay-4000" />
            </div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg">
                {/* Logo & Branding */}
                <div className="text-center mb-10 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6">
                        <img src="/codelogo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-3">
                        CodeSphere
                    </h1>
                    <p className="text-slate-400 text-lg">Real-time collaborative code editing</p>
                </div>

                {/* Features row */}
                <div className="flex justify-center gap-6 mb-10 animate-fade-in animation-delay-200">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Users size={14} className="text-indigo-400" />
                        <span>Multi-user</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <MessageSquare size={14} className="text-purple-400" />
                        <span>Comments</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Zap size={14} className="text-cyan-400" />
                        <span>Real-time</span>
                    </div>
                </div>

                {/* Main Card */}
                <div className="glass-card rounded-2xl p-8 animate-fade-in animation-delay-400">
                    {/* User Name */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Your Display Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => { setUserName(e.target.value); setError(''); }}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter your name..."
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                                disabled={loading}
                            />
                            <Sparkles size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700/50" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 text-xs text-slate-500 bg-slate-900/80 backdrop-blur-sm">
                                CREATE OR JOIN
                            </span>
                        </div>
                    </div>

                    {/* Create New Room */}
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Plus size={18} />
                                Create New Room
                            </>
                        )}
                    </button>

                    {/* Join Existing Room */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => { setRoomId(e.target.value); setError(''); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter room ID..."
                            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                            disabled={loading}
                        />
                        <button
                            onClick={handleJoin}
                            disabled={loading}
                            className="px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 bg-slate-800 border border-slate-700/50 text-slate-200 hover:bg-slate-700 hover:border-slate-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowRight size={16} />
                            Join
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-8 animate-fade-in animation-delay-600">
                    Share your room ID with others to start collaborating
                </p>
            </div>
        </div>
    );
}
