export interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
}

export interface Comment {
  id: string;
  fileId: string;
  lineNumber: number;
  text: string;
  author: string;
  authorColor: string;
  timestamp: number;
  resolved: boolean;
}

export type UserRole = 'owner' | 'editor' | 'viewer';

export interface User {
  id: string;       // socket ID (for real-time presence)
  uid: string;      // Firebase Auth UID
  name: string;
  color: string;
  role: UserRole;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  fileId: string;
  position: CursorPosition;
}

export interface RoomState {
  id: string;
  ownerId: string;   // Firebase Auth UID of the room creator
  files: FileItem[];
  users: User[];
  comments: Comment[];
}

export interface AppState {
  room: RoomState | null;
  currentUser: User | null;
  activeFileId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  remoteCursors: RemoteCursor[];
}
