import { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import {
    MessageSquare, Plus, Check, Trash2, X,
    ChevronDown, ChevronRight, Send, EyeOff,
} from 'lucide-react';

export function CommentPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { state, getFileComments, addComment, resolveComment, deleteComment, isViewer } = useFileSystem();
    const [newCommentLine, setNewCommentLine] = useState('');
    const [newCommentText, setNewCommentText] = useState('');
    const [showResolved, setShowResolved] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const activeFileId = state.activeFileId;
    const comments = activeFileId ? getFileComments(activeFileId) : [];
    const activeComments = comments.filter((c) => !c.resolved);
    const resolvedComments = comments.filter((c) => c.resolved);

    const handleAddComment = () => {
        if (!activeFileId || !newCommentText.trim() || !newCommentLine.trim()) return;
        const lineNum = parseInt(newCommentLine, 10);
        if (isNaN(lineNum) || lineNum < 1) return;

        addComment(activeFileId, lineNum, newCommentText.trim());
        setNewCommentText('');
        setNewCommentLine('');
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700/50 flex flex-col h-full animate-slide-in-right">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-purple-400" />
                    <h3 className="font-semibold text-slate-200 text-sm">Comments</h3>
                    {activeComments.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                            {activeComments.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {/* Hide add button for viewers */}
                    {!isViewer && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Add Comment"
                        >
                            <Plus size={14} className="text-slate-400" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={14} className="text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Viewer notice */}
            {isViewer && (
                <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center gap-2">
                    <EyeOff size={14} className="text-slate-500 flex-shrink-0" />
                    <p className="text-xs text-slate-500">You are in view-only mode. You can read comments but cannot add new ones.</p>
                </div>
            )}

            {/* Add Comment Form */}
            {isAdding && !isViewer && (
                <div className="p-3 border-b border-slate-700/50 bg-slate-800/50 animate-fade-in">
                    <div className="flex gap-2 mb-2">
                        <input
                            type="number"
                            min="1"
                            value={newCommentLine}
                            onChange={(e) => setNewCommentLine(e.target.value)}
                            placeholder="Line #"
                            className="w-20 px-2 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-xs"
                            autoFocus
                        />
                        <span className="text-slate-500 text-xs flex items-center">on line</span>
                    </div>
                    <div className="flex gap-2">
                        <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write a comment..."
                            rows={2}
                            className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 text-xs resize-none"
                        />
                        <button
                            onClick={handleAddComment}
                            className="self-end p-2 bg-purple-500 hover:bg-purple-400 rounded-lg transition-colors"
                        >
                            <Send size={12} className="text-white" />
                        </button>
                    </div>
                </div>
            )}

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeComments.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
                        <MessageSquare size={32} className="mb-3 opacity-30" />
                        <p className="text-sm text-center">No comments yet</p>
                        {!isViewer && (
                            <p className="text-xs text-center mt-1">Click + to add a comment</p>
                        )}
                    </div>
                )}

                {activeComments.map((comment) => (
                    <div key={comment.id} className="px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                        <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: comment.authorColor }}
                                >
                                    {comment.author[0]?.toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-slate-300">{comment.author}</span>
                            </div>
                            <span className="text-[10px] text-slate-600">{formatTime(comment.timestamp)}</span>
                        </div>
                        <div className="ml-7">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono mb-1.5">
                                Line {comment.lineNumber}
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed">{comment.text}</p>
                        </div>
                        {!isViewer && (
                            <div className="ml-7 mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => resolveComment(comment.id)}
                                    className="p-1 hover:bg-green-500/20 rounded text-green-400 transition-colors"
                                    title="Resolve"
                                >
                                    <Check size={12} />
                                </button>
                                <button
                                    onClick={() => deleteComment(comment.id)}
                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Resolved Section */}
                {resolvedComments.length > 0 && (
                    <div className="mt-2">
                        <button
                            onClick={() => setShowResolved(!showResolved)}
                            className="w-full px-4 py-2 flex items-center gap-2 text-xs text-slate-500 hover:bg-slate-800/30 transition-colors"
                        >
                            {showResolved ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            Resolved ({resolvedComments.length})
                        </button>
                        {showResolved &&
                            resolvedComments.map((comment) => (
                                <div key={comment.id} className="px-4 py-3 border-b border-slate-800/50 opacity-50 hover:opacity-75 transition-opacity group">
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                                style={{ backgroundColor: comment.authorColor }}
                                            >
                                                {comment.author[0]?.toUpperCase()}
                                            </div>
                                            <span className="text-xs font-medium text-slate-300 line-through">{comment.author}</span>
                                        </div>
                                    </div>
                                    <div className="ml-7">
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono mb-1.5">
                                            Line {comment.lineNumber}
                                        </span>
                                        <p className="text-xs text-slate-400 leading-relaxed line-through">{comment.text}</p>
                                    </div>
                                    {!isViewer && (
                                        <div className="ml-7 mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => resolveComment(comment.id)}
                                                className="p-1 hover:bg-yellow-500/20 rounded text-yellow-400 transition-colors text-[10px]"
                                                title="Unresolve"
                                            >
                                                Reopen
                                            </button>
                                            <button
                                                onClick={() => deleteComment(comment.id)}
                                                className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
