require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Firebase Admin Init ───────────────────────────────────────────────────────
let db = null;
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

// Try env var first (for Railway/production), then fall back to local file
try {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log('📦 Using Firebase service account from environment variable');
  } else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    console.log('📦 Using Firebase service account from local file');
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    console.log('✅ Firebase Admin initialized — Firestore connected');
  } else {
    console.warn('⚠️  No Firebase credentials found — using in-memory store (data will not persist)');
  }
} catch (e) {
  console.warn('⚠️  Firebase Admin init failed:', e.message);
  console.warn('⚠️  Falling back to in-memory store');
}

// ─── Express + Socket.IO ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://codecollab-eta.vercel.app',
  'https://codecollab-1xzx.vercel.app',
  'https://codecollab-git-main-ks-projects-9bf6abdf.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// ─── In-Memory Fallback Store ──────────────────────────────────────────────────
const memRooms = new Map();

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#22c55e', '#3b82f6', '#f97316', '#06b6d4',
];
function getRandomColor(index) {
  return COLORS[index % COLORS.length];
}

// ─── Default Files ─────────────────────────────────────────────────────────────
const defaultFiles = [
  {
    id: '1', name: 'index.html', language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
</head>
<body>
    <h1>Welcome to CodeSphere!</h1>
    <p>Start collaborating in real-time.</p>
</body>
</html>`,
  },
  {
    id: '2', name: 'app.js', language: 'javascript',
    content: `// CodeSphere — Real-time collaborative editor
console.log('Hello from CodeSphere!');

function greet(name) {
    return \`Hello, \${name}! Welcome to the session.\`;
}

greet('Developer');`,
  },
  {
    id: '3', name: 'styles.css', language: 'css',
    content: `body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #0f172a;
    color: #e2e8f0;
}

h1 {
    color: #818cf8;
}`,
  },
];

// ─── Firestore Helpers ─────────────────────────────────────────────────────────
async function getRoomFromFirestore(roomId) {
  if (!db) return null;
  const doc = await db.collection('rooms').doc(roomId).get();
  if (!doc.exists) return null;
  return doc.data();
}

async function saveRoomToFirestore(roomId, data) {
  if (!db) return;
  await db.collection('rooms').doc(roomId).set(data, { merge: true });
}

async function updateRoomField(roomId, field, value) {
  if (!db) return;
  await db.collection('rooms').doc(roomId).update({ [field]: value });
}

// ─── In-Memory Active Users (presence — always in-memory) ─────────────────────
// roomId -> Map<socketId, userObject>
const activeUsers = new Map();

function getActiveUsers(roomId) {
  return Array.from(activeUsers.get(roomId)?.values() || []);
}

// ─── Room Creation ─────────────────────────────────────────────────────────────
async function createRoom(ownerUid) {
  const roomId = uuidv4().slice(0, 8);
  const roomData = {
    id: roomId,
    ownerId: ownerUid || 'anonymous',
    files: JSON.parse(JSON.stringify(defaultFiles)),
    comments: [],
    userRoles: {},   // uid -> role
    createdAt: Date.now(),
  };

  if (db) {
    await db.collection('rooms').doc(roomId).set(roomData);
  } else {
    memRooms.set(roomId, roomData);
  }
  return roomId;
}

async function getRoom(roomId) {
  if (db) {
    return await getRoomFromFirestore(roomId);
  }
  return memRooms.get(roomId) || null;
}

async function ensureRoom(roomId, ownerUid) {
  let room = await getRoom(roomId);
  if (!room) {
    room = {
      id: roomId,
      ownerId: ownerUid || 'anonymous',
      files: JSON.parse(JSON.stringify(defaultFiles)),
      comments: [],
      userRoles: {},
      createdAt: Date.now(),
    };
    if (db) {
      await db.collection('rooms').doc(roomId).set(room);
    } else {
      memRooms.set(roomId, room);
    }
  }
  return room;
}

// ─── REST Endpoints ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('CodeSphere backend running 🚀');
});

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', firestoreConnected: !!db });
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { ownerUid } = req.body;
    const roomId = await createRoom(ownerUid);
    res.json({ roomId });
  } catch (e) {
    console.error('Room creation error:', e);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({
      id: room.id,
      ownerId: room.ownerId,
      files: room.files,
      comments: room.comments,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// ─── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.id}`);

  let currentRoomId = null;
  let currentUser = null;

  // ── Join Room ──────────────────────────────────────────────────────────────
  socket.on('join-room', async ({ roomId, userName, uid }, callback) => {
    try {
      const userUid = uid || 'anonymous';
      const room = await ensureRoom(roomId, userUid);

      // Initialize active users map for this room
      if (!activeUsers.has(roomId)) {
        activeUsers.set(roomId, new Map());
      }
      const roomUsers = activeUsers.get(roomId);

      // Determine role
      let role = 'viewer';
      if (room.ownerId === userUid) {
        role = 'owner';
      } else if (room.userRoles && room.userRoles[userUid]) {
        role = room.userRoles[userUid];
      }

      currentRoomId = roomId;
      currentUser = {
        id: socket.id,
        uid: userUid,
        name: userName || `User-${socket.id.slice(0, 4)}`,
        color: getRandomColor(roomUsers.size),
        role,
      };

      roomUsers.set(socket.id, currentUser);
      socket.join(roomId);

      const usersArray = getActiveUsers(roomId);

      callback({
        success: true,
        room: {
          id: room.id,
          ownerId: room.ownerId,
          files: room.files,
          users: usersArray,
          comments: room.comments,
        },
        user: currentUser,
      });

      // Notify others
      socket.to(roomId).emit('user-joined', {
        user: currentUser,
        users: usersArray,
      });

      console.log(`[WS] ${currentUser.name} (${role}) joined room ${roomId} (${usersArray.length} users)`);
    } catch (e) {
      console.error('join-room error:', e);
      callback({ success: false, error: e.message });
    }
  });

  // ── Code Change ────────────────────────────────────────────────────────────
  socket.on('code-change', async ({ fileId, content }) => {
    if (!currentRoomId || !currentUser) return;
    if (currentUser.role === 'viewer') return; // permission check

    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;

      const fileIndex = room.files.findIndex((f) => f.id === fileId);
      if (fileIndex !== -1) {
        room.files[fileIndex].content = content;
        if (db) {
          await updateRoomField(currentRoomId, 'files', room.files);
        } else {
          memRooms.set(currentRoomId, room);
        }
        socket.to(currentRoomId).emit('code-change', { fileId, content, userId: socket.id });
      }
    } catch (e) {
      console.error('code-change error:', e);
    }
  });

  // ── Cursor Update ──────────────────────────────────────────────────────────
  socket.on('cursor-update', ({ fileId, position }) => {
    if (!currentRoomId || !currentUser) return;
    socket.to(currentRoomId).emit('cursor-update', {
      userId: socket.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      fileId,
      position,
    });
  });

  // ── File Operations ────────────────────────────────────────────────────────
  socket.on('file-create', async ({ file }) => {
    if (!currentRoomId || !currentUser) return;
    if (currentUser.role === 'viewer') return;

    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      room.files.push(file);
      if (db) {
        await updateRoomField(currentRoomId, 'files', room.files);
      } else {
        memRooms.set(currentRoomId, room);
      }
      socket.to(currentRoomId).emit('file-created', { file });
    } catch (e) {
      console.error('file-create error:', e);
    }
  });

  socket.on('file-delete', async ({ fileId }) => {
    if (!currentRoomId || !currentUser) return;
    if (currentUser.role === 'viewer') return;

    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      room.files = room.files.filter((f) => f.id !== fileId);
      room.comments = room.comments.filter((c) => c.fileId !== fileId);
      if (db) {
        await db.collection('rooms').doc(currentRoomId).update({
          files: room.files,
          comments: room.comments,
        });
      } else {
        memRooms.set(currentRoomId, room);
      }
      socket.to(currentRoomId).emit('file-deleted', { fileId });
    } catch (e) {
      console.error('file-delete error:', e);
    }
  });

  // ── Comments ───────────────────────────────────────────────────────────────
  socket.on('comment-add', async ({ comment }) => {
    if (!currentRoomId || !currentUser) return;
    if (currentUser.role === 'viewer') return;

    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;

      const newComment = {
        ...comment,
        id: uuidv4(),
        timestamp: Date.now(),
        resolved: false,
      };

      room.comments.push(newComment);
      if (db) {
        await updateRoomField(currentRoomId, 'comments', room.comments);
      } else {
        memRooms.set(currentRoomId, room);
      }
      io.to(currentRoomId).emit('comment-added', { comment: newComment });
    } catch (e) {
      console.error('comment-add error:', e);
    }
  });

  socket.on('comment-resolve', async ({ commentId }) => {
    if (!currentRoomId) return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      const comment = room.comments.find((c) => c.id === commentId);
      if (comment) {
        comment.resolved = !comment.resolved;
        if (db) {
          await updateRoomField(currentRoomId, 'comments', room.comments);
        } else {
          memRooms.set(currentRoomId, room);
        }
        io.to(currentRoomId).emit('comment-resolved', { commentId, resolved: comment.resolved });
      }
    } catch (e) {
      console.error('comment-resolve error:', e);
    }
  });

  socket.on('comment-delete', async ({ commentId }) => {
    if (!currentRoomId) return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      room.comments = room.comments.filter((c) => c.id !== commentId);
      if (db) {
        await updateRoomField(currentRoomId, 'comments', room.comments);
      } else {
        memRooms.set(currentRoomId, room);
      }
      io.to(currentRoomId).emit('comment-deleted', { commentId });
    } catch (e) {
      console.error('comment-delete error:', e);
    }
  });

  // ── Role Change ────────────────────────────────────────────────────────────
  socket.on('role-change', async ({ targetUserId, newRole }) => {
    if (!currentRoomId || !currentUser) return;
    if (currentUser.role !== 'owner') return; // only owner can change roles
    if (newRole === 'owner') return; // cannot promote to owner

    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;

      // Find target user in active users
      const roomUsers = activeUsers.get(currentRoomId);
      const targetUser = roomUsers?.get(targetUserId);
      if (!targetUser) return;
      if (targetUser.role === 'owner') return; // cannot change owner's role

      // Update in-memory active user
      targetUser.role = newRole;
      roomUsers.set(targetUserId, targetUser);

      // Persist role in Firestore (keyed by Firebase UID)
      if (!room.userRoles) room.userRoles = {};
      room.userRoles[targetUser.uid] = newRole;
      if (db) {
        await updateRoomField(currentRoomId, 'userRoles', room.userRoles);
      } else {
        memRooms.set(currentRoomId, room);
      }

      const updatedUsers = getActiveUsers(currentRoomId);
      io.to(currentRoomId).emit('role-updated', { users: updatedUsers });
      console.log(`[WS] ${currentUser.name} changed ${targetUser.name}'s role to ${newRole}`);
    } catch (e) {
      console.error('role-change error:', e);
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (currentRoomId && currentUser) {
      const roomUsers = activeUsers.get(currentRoomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        const usersArray = getActiveUsers(currentRoomId);
        socket.to(currentRoomId).emit('user-left', {
          userId: socket.id,
          users: usersArray,
        });
        console.log(`[WS] ${currentUser.name} left room ${currentRoomId} (${usersArray.length} users)`);

        // Clean up empty rooms from memory after 5 min
        if (usersArray.length === 0) {
          setTimeout(() => {
            const users = getActiveUsers(currentRoomId);
            if (users.length === 0) {
              activeUsers.delete(currentRoomId);
              if (!db) memRooms.delete(currentRoomId);
              console.log(`[WS] Room ${currentRoomId} cleaned up from memory`);
            }
          }, 5 * 60 * 1000);
        }
      }
    }
    console.log(`[WS] Disconnected: ${socket.id}`);
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  🚀 CodeSphere server running on http://localhost:${PORT}\n`);
});
