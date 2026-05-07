import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { FileItem, Comment, User, UserRole, RemoteCursor, AppState, RoomSummary } from '../types';
import { connectSocket, disconnectSocket, getSocket } from '../socket';
import { useAuth } from './AuthContext';

interface FileSystemContextType {
  state: AppState;
  createRoom: (userName: string, projectName: string, language: string) => Promise<void>;
  joinRoom: (roomId: string, userName: string) => Promise<void>;
  leaveRoom: () => void;
  createFile: (name: string, language: string) => void;
  deleteFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  getActiveFile: () => FileItem | undefined;
  addComment: (fileId: string, lineNumber: number, text: string) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  getFileComments: (fileId: string) => Comment[];
  updateCursor: (fileId: string, position: { lineNumber: number; column: number }) => void;
  changeUserRole: (targetUserId: string, newRole: UserRole) => void;
  fetchUserRooms: () => Promise<RoomSummary[]>;
  deleteRoom: (roomId: string) => Promise<void>;
  isOwner: boolean;
  isEditor: boolean;
  isViewer: boolean;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const { authUser } = useAuth();

  const [state, setState] = useState<AppState>({
    room: null,
    currentUser: null,
    activeFileId: null,
    connectionStatus: 'disconnected',
    remoteCursors: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const role = state.currentUser?.role;
  const isOwner = role === 'owner';
  const isEditor = role === 'editor' || role === 'owner';
  const isViewer = role === 'viewer';

  // ── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
    });

    socket.on('reconnecting', () => {
      setState((prev) => ({ ...prev, connectionStatus: 'connecting' }));
    });

    socket.on('code-change', ({ fileId, content }: { fileId: string; content: string }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            files: prev.room.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
          },
        };
      });
    });

    socket.on('cursor-update', (cursor: RemoteCursor) => {
      setState((prev) => ({
        ...prev,
        remoteCursors: [
          ...prev.remoteCursors.filter((c) => c.userId !== cursor.userId),
          cursor,
        ],
      }));
    });

    socket.on('user-joined', ({ users }: { user: User; users: User[] }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return { ...prev, room: { ...prev.room, users } };
      });
    });

    socket.on('user-left', ({ userId, users }: { userId: string; users: User[] }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: { ...prev.room, users },
          remoteCursors: prev.remoteCursors.filter((c) => c.userId !== userId),
        };
      });
    });

    socket.on('file-created', ({ file }: { file: FileItem }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: { ...prev.room, files: [...prev.room.files, file] },
        };
      });
    });

    socket.on('file-deleted', ({ fileId }: { fileId: string }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        const newFiles = prev.room.files.filter((f) => f.id !== fileId);
        return {
          ...prev,
          room: {
            ...prev.room,
            files: newFiles,
            comments: prev.room.comments.filter((c) => c.fileId !== fileId),
          },
          activeFileId: prev.activeFileId === fileId ? (newFiles[0]?.id || null) : prev.activeFileId,
        };
      });
    });

    socket.on('comment-added', ({ comment }: { comment: Comment }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: { ...prev.room, comments: [...prev.room.comments, comment] },
        };
      });
    });

    socket.on('comment-resolved', ({ commentId, resolved }: { commentId: string; resolved: boolean }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            comments: prev.room.comments.map((c) =>
              c.id === commentId ? { ...c, resolved } : c
            ),
          },
        };
      });
    });

    socket.on('comment-deleted', ({ commentId }: { commentId: string }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        return {
          ...prev,
          room: {
            ...prev.room,
            comments: prev.room.comments.filter((c) => c.id !== commentId),
          },
        };
      });
    });

    socket.on('role-updated', ({ users }: { users: User[] }) => {
      setState((prev) => {
        if (!prev.room) return prev;
        const updatedCurrentUser = users.find((u) => u.id === prev.currentUser?.id);
        return {
          ...prev,
          room: { ...prev.room, users },
          currentUser: updatedCurrentUser || prev.currentUser,
        };
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnecting');
      socket.off('code-change');
      socket.off('cursor-update');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('file-created');
      socket.off('file-deleted');
      socket.off('comment-added');
      socket.off('comment-resolved');
      socket.off('comment-deleted');
      socket.off('role-updated');
    };
  }, []);

  // ── Room Operations ──────────────────────────────────────────────────────
  const createRoom = useCallback(async (userName: string, projectName: string, language: string) => {
    const uid = authUser?.uid || 'anonymous';
    setState((prev) => ({ ...prev, connectionStatus: 'connecting' }));
    const res = await fetch(`${SERVER_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerUid: uid, name: projectName, language }),
    });
    const { roomId } = await res.json();
    await joinRoom(roomId, userName);
  }, [authUser]);

  const joinRoom = useCallback(async (roomId: string, userName: string) => {
    const uid = authUser?.uid || 'anonymous';
    const avatar = authUser?.photoURL || undefined;
    setState((prev) => ({ ...prev, connectionStatus: 'connecting' }));
    const socket = connectSocket();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);

      const tryJoin = () => {
        socket.emit(
          'join-room',
          { roomId, userName, uid, avatar },
          (response: { success: boolean; room: any; user: User }) => {
            clearTimeout(timeout);
            if (response.success) {
              setState((prev) => ({
                ...prev,
                room: response.room,
                currentUser: response.user,
                activeFileId: response.room.files[0]?.id || null,
                connectionStatus: 'connected',
                remoteCursors: [],
              }));
              resolve();
            } else {
              reject(new Error('Failed to join room'));
            }
          }
        );
      };

      if (socket.connected) {
        tryJoin();
      } else {
        socket.once('connect', tryJoin);
      }
    });
  }, [authUser]);

  const leaveRoom = useCallback(() => {
    disconnectSocket();
    setState({
      room: null,
      currentUser: null,
      activeFileId: null,
      connectionStatus: 'disconnected',
      remoteCursors: [],
    });
  }, []);

  // ── Fetch user's rooms ───────────────────────────────────────────────────
  const fetchUserRooms = useCallback(async (): Promise<RoomSummary[]> => {
    const uid = authUser?.uid;
    if (!uid) return [];
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/user/${uid}`);
      const data = await res.json();
      return data.rooms || [];
    } catch {
      return [];
    }
  }, [authUser]);

  const deleteRoom = useCallback(async (roomId: string): Promise<void> => {
    const uid = authUser?.uid;
    if (!uid) return;
    await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
  }, [authUser]);

  // ── File Operations ──────────────────────────────────────────────────────
  const createFile = useCallback((name: string, language: string) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      language,
      content: '',
    };
    setState((prev) => {
      if (!prev.room) return prev;
      return {
        ...prev,
        room: { ...prev.room, files: [...prev.room.files, newFile] },
        activeFileId: newFile.id,
      };
    });
    getSocket().emit('file-create', { file: newFile });
  }, []);

  const deleteFile = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.room) return prev;
      const newFiles = prev.room.files.filter((f) => f.id !== id);
      return {
        ...prev,
        room: {
          ...prev.room,
          files: newFiles,
          comments: prev.room.comments.filter((c) => c.fileId !== id),
        },
        activeFileId: prev.activeFileId === id ? (newFiles[0]?.id || null) : prev.activeFileId,
      };
    });
    getSocket().emit('file-delete', { fileId: id });
  }, []);

  const updateFileContent = useCallback((id: string, content: string) => {
    setState((prev) => {
      if (!prev.room) return prev;
      return {
        ...prev,
        room: {
          ...prev.room,
          files: prev.room.files.map((f) => (f.id === id ? { ...f, content } : f)),
        },
      };
    });
    getSocket().emit('code-change', { fileId: id, content });
  }, []);

  const setActiveFile = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeFileId: id }));
  }, []);

  const getActiveFile = useCallback(() => {
    return stateRef.current.room?.files.find((f) => f.id === stateRef.current.activeFileId);
  }, []);

  // ── Comment Operations ───────────────────────────────────────────────────
  const addComment = useCallback((fileId: string, lineNumber: number, text: string) => {
    const current = stateRef.current;
    if (!current.currentUser) return;
    getSocket().emit('comment-add', {
      comment: {
        fileId,
        lineNumber,
        text,
        author: current.currentUser.name,
        authorColor: current.currentUser.color,
      },
    });
  }, []);

  const resolveComment = useCallback((commentId: string) => {
    getSocket().emit('comment-resolve', { commentId });
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    getSocket().emit('comment-delete', { commentId });
  }, []);

  const getFileComments = useCallback((fileId: string) => {
    return stateRef.current.room?.comments.filter((c) => c.fileId === fileId) || [];
  }, []);

  // ── Cursor ───────────────────────────────────────────────────────────────
  const updateCursor = useCallback((fileId: string, position: { lineNumber: number; column: number }) => {
    getSocket().emit('cursor-update', { fileId, position });
  }, []);

  // ── Role Management ──────────────────────────────────────────────────────
  const changeUserRole = useCallback((targetUserId: string, newRole: UserRole) => {
    getSocket().emit('role-change', { targetUserId, newRole });
  }, []);

  return (
    <FileSystemContext.Provider
      value={{
        state,
        createRoom,
        joinRoom,
        leaveRoom,
        createFile,
        deleteFile,
        updateFileContent,
        setActiveFile,
        getActiveFile,
        addComment,
        resolveComment,
        deleteComment,
        getFileComments,
        updateCursor,
        changeUserRole,
        fetchUserRooms,
        deleteRoom,
        isOwner,
        isEditor,
        isViewer,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within FileSystemProvider');
  }
  return context;
}
