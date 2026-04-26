require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const leoProfanity = require('leo-profanity');
// [NEW ADDITION - Offensive Language Filter] ML-powered classification service
const { classifyComment } = require('./services/offensiveLanguageFilter');

// ─── Firebase Admin Init ───────────────────────────────────────────────────────
let db = null;
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

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
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    console.log('✅ Firebase Admin initialized — Firestore connected');
  } else {
    console.warn('⚠️  No Firebase credentials — in-memory mode');
  }
} catch (e) {
  console.warn('⚠️  Firebase init failed:', e.message, '— in-memory mode');
}

// ─── Express + Socket.IO ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://codecollab-eta.vercel.app',
  'https://codecollab-1xzx.vercel.app',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
];

const corsCallback = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
};

const io = new Server(server, { cors: { origin: corsCallback, methods: ['GET', 'POST', 'DELETE'], credentials: true } });
app.use(cors({ origin: corsCallback, methods: ['GET', 'POST', 'DELETE'], credentials: true }));
app.use(express.json());

// ─── In-Memory Fallback ────────────────────────────────────────────────────────
const memRooms = new Map();

const COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#22c55e','#3b82f6','#f97316','#06b6d4'];
function getRandomColor(i) { return COLORS[i % COLORS.length]; }

// ─── Language Templates ────────────────────────────────────────────────────────
const TEMPLATES = {
  javascript: [
    { id: '1', name: 'index.js', language: 'javascript', content: '// JavaScript Project\nconsole.log("Hello World!");\n' },
    { id: '2', name: 'index.html', language: 'html', content: '<!DOCTYPE html>\n<html><head><title>App</title></head>\n<body><script src="index.js"></script></body></html>\n' },
    { id: '3', name: 'style.css', language: 'css', content: 'body { font-family: sans-serif; margin: 0; padding: 20px; }\n' },
  ],
  typescript: [
    { id: '1', name: 'index.ts', language: 'typescript', content: '// TypeScript Project\nconst greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet("World"));\n' },
    { id: '2', name: 'tsconfig.json', language: 'json', content: '{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "ESNext",\n    "strict": true\n  }\n}\n' },
  ],
  python: [
    { id: '1', name: 'main.py', language: 'python', content: '# Python Project\ndef main():\n    print("Hello World!")\n\nif __name__ == "__main__":\n    main()\n' },
    { id: '2', name: 'requirements.txt', language: 'plaintext', content: '# Add your dependencies here\n' },
  ],
  html: [
    { id: '1', name: 'index.html', language: 'html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n' },
    { id: '2', name: 'style.css', language: 'css', content: 'body {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n  background: #0f172a;\n  color: #e2e8f0;\n}\n' },
    { id: '3', name: 'script.js', language: 'javascript', content: '// Add your JavaScript here\nconsole.log("Page loaded!");\n' },
  ],
  java: [
    { id: '1', name: 'Main.java', language: 'java', content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}\n' },
  ],
  cpp: [
    { id: '1', name: 'main.cpp', language: 'cpp', content: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}\n' },
  ],
  c: [
    { id: '1', name: 'main.c', language: 'c', content: '#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}\n' },
  ],
  go: [
    { id: '1', name: 'main.go', language: 'go', content: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello World!")\n}\n' },
  ],
  rust: [
    { id: '1', name: 'main.rs', language: 'rust', content: 'fn main() {\n    println!("Hello World!");\n}\n' },
  ],
  ruby: [
    { id: '1', name: 'main.rb', language: 'ruby', content: '# Ruby Project\nputs "Hello World!"\n' },
  ],
  php: [
    { id: '1', name: 'index.php', language: 'php', content: '<?php\necho "Hello World!";\n?>\n' },
  ],
  sql: [
    { id: '1', name: 'queries.sql', language: 'sql', content: '-- SQL Queries\nSELECT * FROM users;\n' },
  ],
};

function getTemplateFiles(language) {
  return JSON.parse(JSON.stringify(TEMPLATES[language] || TEMPLATES.javascript));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function getRoom(roomId) {
  if (db) {
    const doc = await db.collection('rooms').doc(roomId).get();
    return doc.exists ? doc.data() : null;
  }
  return memRooms.get(roomId) || null;
}

async function updateRoomField(roomId, field, value) {
  if (db) await db.collection('rooms').doc(roomId).update({ [field]: value });
}

const activeUsers = new Map();
function getActiveUsers(roomId) { return Array.from(activeUsers.get(roomId)?.values() || []); }

// ─── Room Creation ─────────────────────────────────────────────────────────────
async function createRoom(ownerUid, name, language) {
  const roomId = uuidv4().slice(0, 8);
  const lang = language || 'javascript';
  const roomData = {
    id: roomId,
    name: name || 'Untitled Project',
    language: lang,
    ownerId: ownerUid || 'anonymous',
    files: getTemplateFiles(lang),
    comments: [],
    userRoles: {},
    participants: [ownerUid],
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
  };
  if (db) await db.collection('rooms').doc(roomId).set(roomData);
  else memRooms.set(roomId, roomData);
  return roomId;
}

async function ensureRoom(roomId, ownerUid) {
  let room = await getRoom(roomId);
  if (!room) {
    room = {
      id: roomId, name: 'Untitled Project', language: 'javascript',
      ownerId: ownerUid || 'anonymous', files: getTemplateFiles('javascript'),
      comments: [], userRoles: {}, participants: [ownerUid],
      createdAt: Date.now(), lastModifiedAt: Date.now(),
    };
    if (db) await db.collection('rooms').doc(roomId).set(room);
    else memRooms.set(roomId, room);
  }
  return room;
}

// ─── REST Endpoints ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('CodeSphere backend running 🚀'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', firestoreConnected: !!db }));

app.post('/api/rooms', async (req, res) => {
  try {
    const { ownerUid, name, language } = req.body;
    const roomId = await createRoom(ownerUid, name, language);
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
    res.json(room);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch room' }); }
});

// Delete room (owner only)
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { uid } = req.body;
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== uid) return res.status(403).json({ error: 'Only the owner can delete this room' });
    if (db) await db.collection('rooms').doc(req.params.id).delete();
    else memRooms.delete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete room' }); }
});

// Get rooms for a user (owned + participated)
app.get('/api/rooms/user/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    let rooms = [];
    if (db) {
      // Query rooms where user is owner
      const ownedSnap = await db.collection('rooms').where('ownerId', '==', uid).get();
      ownedSnap.forEach(doc => rooms.push(doc.data()));
      // Query rooms where user is in participants
      const partSnap = await db.collection('rooms').where('participants', 'array-contains', uid).get();
      partSnap.forEach(doc => {
        if (!rooms.find(r => r.id === doc.data().id)) rooms.push(doc.data());
      });
    } else {
      for (const room of memRooms.values()) {
        if (room.ownerId === uid || (room.participants && room.participants.includes(uid))) {
          rooms.push(room);
        }
      }
    }
    // Return summaries
    const summaries = rooms.map(r => ({
      id: r.id, name: r.name || 'Untitled', language: r.language || 'javascript',
      ownerId: r.ownerId, createdAt: r.createdAt, lastModifiedAt: r.lastModifiedAt || r.createdAt,
      fileCount: (r.files || []).length, participants: r.participants || [],
    }));
    summaries.sort((a, b) => (b.lastModifiedAt || 0) - (a.lastModifiedAt || 0));
    res.json({ rooms: summaries });
  } catch (e) {
    console.error('Fetch user rooms error:', e);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// ─── Code Execution ────────────────────────────────────────────────────────────
const { execFile, exec } = require('child_process');
const os = require('os');

// Map project language → { cmd, args(mainFile), ext }
const EXEC_MAP = {
  javascript: { cmd: 'node',    ext: '.js'   },
  typescript: { cmd: 'npx',    args: ['ts-node', '--esm'], ext: '.ts' },
  python:     { cmd: 'python',  ext: '.py'   },
  python3:    { cmd: 'python3', ext: '.py'   },
  java:       { cmd: 'java',    ext: '.java' },  // compiled specially
  cpp:        { cmd: 'g++',     ext: '.cpp'  },  // compiled specially
  c:          { cmd: 'gcc',     ext: '.c'    },  // compiled specially
  go:         { cmd: 'go',      args: ['run'], ext: '.go' },
  rust:       { cmd: 'rustc',   ext: '.rs'   },  // compiled specially
  ruby:       { cmd: 'ruby',    ext: '.rb'   },
  php:        { cmd: 'php',     ext: '.php'  },
};

function runInTmp(language, files, callback) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesphere-'));
  const startTime = Date.now();

  // Write all files into temp dir
  for (const f of files) {
    fs.writeFileSync(path.join(tmpDir, f.name), f.content || '');
  }

  const map = EXEC_MAP[language];
  if (!map) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return callback(null, { stdout: '', stderr: `Language '${language}' is not supported for execution on this server.`, exitCode: 1, runtimeMs: 0 });
  }

  // Find main file
  const mainFile = files.find(f => f.name.endsWith(map.ext)) || files[0];
  if (!mainFile) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return callback(null, { stdout: '', stderr: 'No runnable file found.', exitCode: 1, runtimeMs: 0 });
  }
  const mainPath = path.join(tmpDir, mainFile.name);

  const done = (err, stdout, stderr, code) => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    callback(err, { stdout: stdout || '', stderr: stderr || '', exitCode: code ?? (err ? 1 : 0), runtimeMs: Date.now() - startTime });
  };

  // Compiled languages need a two-step approach
  if (language === 'cpp' || language === 'c') {
    const outBin = path.join(tmpDir, 'a.out');
    const compiler = language === 'cpp' ? 'g++' : 'gcc';
    exec(`${compiler} "${mainPath}" -o "${outBin}"`, { timeout: 15000 }, (err, _, stderr) => {
      if (err) return done(null, '', stderr, 1);
      exec(`"${outBin}"`, { timeout: 10000, cwd: tmpDir }, (err2, stdout2, stderr2) => {
        done(null, stdout2, stderr2, err2 ? 1 : 0);
      });
    });
    return;
  }

  if (language === 'rust') {
    const outBin = path.join(tmpDir, 'program');
    exec(`rustc "${mainPath}" -o "${outBin}"`, { timeout: 30000 }, (err, _, stderr) => {
      if (err) return done(null, '', stderr, 1);
      exec(`"${outBin}"`, { timeout: 10000, cwd: tmpDir }, (err2, stdout2, stderr2) => {
        done(null, stdout2, stderr2, err2 ? 1 : 0);
      });
    });
    return;
  }

  if (language === 'java') {
    exec(`javac "${mainPath}"`, { timeout: 15000, cwd: tmpDir }, (err, _, stderr) => {
      if (err) return done(null, '', stderr, 1);
      // Class name = filename without extension
      const className = path.basename(mainFile.name, '.java');
      exec(`java -cp "${tmpDir}" ${className}`, { timeout: 10000 }, (err2, stdout2, stderr2) => {
        done(null, stdout2, stderr2, err2 ? 1 : 0);
      });
    });
    return;
  }

  // Interpreted: node, python, ruby, php, go run
  const cmdArgs = language === 'go'
    ? ['run', mainPath]
    : language === 'typescript'
    ? ['ts-node', mainPath]
    : [mainPath];

  const cmdName = language === 'typescript' ? 'npx' : map.cmd;

  exec(`${cmdName} ${cmdArgs.map(a => `"${a}"`).join(' ')}`, { timeout: 10000, cwd: tmpDir }, (err, stdout, stderr) => {
    done(null, stdout, stderr, err ? (err.code || 1) : 0);
  });
}

app.post('/api/run', (req, res) => {
  const { language, files } = req.body;
  if (!language || !files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'language and files are required' });
  }
  // Try python3 first on Unix, fall back to python
  const lang = language === 'python' && process.platform !== 'win32' ? 'python3' : language;
  runInTmp(lang, files, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
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

      // Add user to participants list (persisted)
      if (room.participants && !room.participants.includes(userUid)) {
        room.participants.push(userUid);
        if (db) await updateRoomField(roomId, 'participants', room.participants);
        else memRooms.set(roomId, room);
      }

      if (!activeUsers.has(roomId)) activeUsers.set(roomId, new Map());
      const roomUsers = activeUsers.get(roomId);

      let role = 'viewer';
      if (room.ownerId === userUid) role = 'owner';
      else if (room.userRoles && room.userRoles[userUid]) role = room.userRoles[userUid];

      currentRoomId = roomId;
      currentUser = {
        id: socket.id, uid: userUid,
        name: userName || `User-${socket.id.slice(0, 4)}`,
        color: getRandomColor(roomUsers.size), role,
      };
      roomUsers.set(socket.id, currentUser);
      socket.join(roomId);

      const usersArray = getActiveUsers(roomId);
      callback({
        success: true,
        room: {
          id: room.id, name: room.name || 'Untitled', language: room.language || 'javascript',
          ownerId: room.ownerId, files: room.files, users: usersArray, comments: room.comments,
        },
        user: currentUser,
      });
      socket.to(roomId).emit('user-joined', { user: currentUser, users: usersArray });
      console.log(`[WS] ${currentUser.name} (${role}) joined ${roomId}`);
    } catch (e) {
      console.error('join-room error:', e);
      callback({ success: false, error: e.message });
    }
  });

  // ── Code Change ────────────────────────────────────────────────────────────
  socket.on('code-change', async ({ fileId, content }) => {
    if (!currentRoomId || !currentUser || currentUser.role === 'viewer') return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      const fi = room.files.findIndex(f => f.id === fileId);
      if (fi !== -1) {
        room.files[fi].content = content;
        room.lastModifiedAt = Date.now();
        if (db) await db.collection('rooms').doc(currentRoomId).update({ files: room.files, lastModifiedAt: room.lastModifiedAt });
        else memRooms.set(currentRoomId, room);
        socket.to(currentRoomId).emit('code-change', { fileId, content, userId: socket.id });
      }
    } catch (e) { console.error('code-change error:', e); }
  });

  // ── Cursor Update ──────────────────────────────────────────────────────────
  socket.on('cursor-update', ({ fileId, position }) => {
    if (!currentRoomId || !currentUser) return;
    socket.to(currentRoomId).emit('cursor-update', {
      userId: socket.id, userName: currentUser.name, userColor: currentUser.color, fileId, position,
    });
  });

  // ── File Operations ────────────────────────────────────────────────────────
  socket.on('file-create', async ({ file }) => {
    if (!currentRoomId || !currentUser || currentUser.role === 'viewer') return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      room.files.push(file);
      room.lastModifiedAt = Date.now();
      if (db) await db.collection('rooms').doc(currentRoomId).update({ files: room.files, lastModifiedAt: room.lastModifiedAt });
      else memRooms.set(currentRoomId, room);
      socket.to(currentRoomId).emit('file-created', { file });
    } catch (e) { console.error('file-create error:', e); }
  });

  socket.on('file-delete', async ({ fileId }) => {
    if (!currentRoomId || !currentUser || currentUser.role === 'viewer') return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      room.files = room.files.filter(f => f.id !== fileId);
      room.comments = room.comments.filter(c => c.fileId !== fileId);
      room.lastModifiedAt = Date.now();
      if (db) await db.collection('rooms').doc(currentRoomId).update({ files: room.files, comments: room.comments, lastModifiedAt: room.lastModifiedAt });
      else memRooms.set(currentRoomId, room);
      socket.to(currentRoomId).emit('file-deleted', { fileId });
    } catch (e) { console.error('file-delete error:', e); }
  });

  // ── Comments (with profanity filter) ───────────────────────────────────────
  socket.on('comment-add', async ({ comment }) => {
    if (!currentRoomId || !currentUser || currentUser.role === 'viewer') return;
    try {
      // Server-side profanity check
      if (leoProfanity.check(comment.text)) {
        socket.emit('comment-rejected', { reason: '🚫 Comment blocked: contains inappropriate language.' });
        return;
      }

      // [NEW ADDITION - Offensive Language Filter] ML-based classification (2nd layer)
      try {
        const mlResult = await classifyComment(comment.text);
        if (mlResult.isOffensive) {
          socket.emit('comment-rejected', {
            reason: `🤖 Comment blocked by AI moderation (confidence: ${(mlResult.confidence * 100).toFixed(0)}%). Please rephrase your comment.`
          });
          // [NEW ADDITION] Also emit the comment_blocked event for dedicated listeners
          socket.emit('comment_blocked', {
            reason: 'Offensive language detected by AI classifier.',
            confidence: mlResult.confidence,
          });
          console.log(`[Moderation] Blocked comment from ${currentUser.name}: "${comment.text.substring(0, 50)}..." (confidence: ${mlResult.confidence.toFixed(3)})`);
          return;
        }
      } catch (mlErr) {
        // [NEW ADDITION] Fail-open: if ML service errors, allow comment through
        console.warn('[Moderation] ML filter error — allowing comment:', mlErr.message);
      }

      const room = await getRoom(currentRoomId);
      if (!room) return;
      const newComment = { ...comment, id: uuidv4(), timestamp: Date.now(), resolved: false };
      room.comments.push(newComment);
      room.lastModifiedAt = Date.now();
      if (db) await db.collection('rooms').doc(currentRoomId).update({ comments: room.comments, lastModifiedAt: room.lastModifiedAt });
      else memRooms.set(currentRoomId, room);
      io.to(currentRoomId).emit('comment-added', { comment: newComment });
    } catch (e) { console.error('comment-add error:', e); }
  });

  socket.on('comment-resolve', async ({ commentId }) => {
    if (!currentRoomId) return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      const c = room.comments.find(c => c.id === commentId);
      if (c) {
        c.resolved = !c.resolved;
        if (db) await updateRoomField(currentRoomId, 'comments', room.comments);
        else memRooms.set(currentRoomId, room);
        io.to(currentRoomId).emit('comment-resolved', { commentId, resolved: c.resolved });
      }
    } catch (e) { console.error('comment-resolve error:', e); }
  });

  socket.on('comment-delete', async ({ commentId }) => {
    if (!currentRoomId) return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      room.comments = room.comments.filter(c => c.id !== commentId);
      if (db) await updateRoomField(currentRoomId, 'comments', room.comments);
      else memRooms.set(currentRoomId, room);
      io.to(currentRoomId).emit('comment-deleted', { commentId });
    } catch (e) { console.error('comment-delete error:', e); }
  });

  // ── Role Change ────────────────────────────────────────────────────────────
  socket.on('role-change', async ({ targetUserId, newRole }) => {
    if (!currentRoomId || !currentUser || currentUser.role !== 'owner') return;
    if (newRole === 'owner') return;
    try {
      const room = await getRoom(currentRoomId);
      if (!room) return;
      const roomUsers = activeUsers.get(currentRoomId);
      const target = roomUsers?.get(targetUserId);
      if (!target || target.role === 'owner') return;
      target.role = newRole;
      roomUsers.set(targetUserId, target);
      if (!room.userRoles) room.userRoles = {};
      room.userRoles[target.uid] = newRole;
      if (db) await updateRoomField(currentRoomId, 'userRoles', room.userRoles);
      else memRooms.set(currentRoomId, room);
      io.to(currentRoomId).emit('role-updated', { users: getActiveUsers(currentRoomId) });
    } catch (e) { console.error('role-change error:', e); }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (currentRoomId && currentUser) {
      const roomUsers = activeUsers.get(currentRoomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        const usersArray = getActiveUsers(currentRoomId);
        socket.to(currentRoomId).emit('user-left', { userId: socket.id, users: usersArray });
        if (usersArray.length === 0) {
          setTimeout(() => {
            if (getActiveUsers(currentRoomId).length === 0) {
              activeUsers.delete(currentRoomId);
              if (!db) memRooms.delete(currentRoomId);
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
server.listen(PORT, () => console.log(`\n  🚀 CodeSphere server on http://localhost:${PORT}\n`));
