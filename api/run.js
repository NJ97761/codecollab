// Vercel Serverless Function — POST /api/run
// Executes code server-side using Node.js child_process.
// JavaScript always works (Node is Vercel's native runtime).
// Other languages work if available in the execution environment.

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EXEC_MAP = {
  javascript: { cmd: 'node',    ext: '.js'   },
  python:     { cmd: 'python3', ext: '.py'   },
  ruby:       { cmd: 'ruby',    ext: '.rb'   },
  php:        { cmd: 'php',     ext: '.php'  },
  go:         { cmd: 'go',      ext: '.go',  args: ['run'] },
};

function runInTmp(language, files, callback) {
  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesphere-'));
  } catch (e) {
    return callback(null, { stdout: '', stderr: 'Failed to create temp directory.', exitCode: 1, runtimeMs: 0 });
  }

  const startTime = Date.now();

  for (const f of files) {
    try {
      fs.writeFileSync(path.join(tmpDir, f.name), f.content || '');
    } catch (_) {}
  }

  const map = EXEC_MAP[language];
  if (!map) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return callback(null, {
      stdout: '',
      stderr: `⚠️ '${language}' execution is not available in the cloud version.\nFor compiled languages (Java, C++, Rust, etc.) please run the project locally.`,
      exitCode: 1,
      runtimeMs: 0,
    });
  }

  const mainFile = files.find(f => f.name.endsWith(map.ext)) || files[0];
  if (!mainFile) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return callback(null, { stdout: '', stderr: 'No runnable file found.', exitCode: 1, runtimeMs: 0 });
  }

  const mainPath = path.join(tmpDir, mainFile.name);
  const done = (stdout, stderr, code) => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    callback(null, { stdout: stdout || '', stderr: stderr || '', exitCode: code, runtimeMs: Date.now() - startTime });
  };

  const cmdStr = map.args
    ? `${map.cmd} ${map.args.join(' ')} "${mainPath}"`
    : `${map.cmd} "${mainPath}"`;

  exec(cmdStr, { timeout: 10000, cwd: tmpDir }, (err, stdout, stderr) => {
    done(stdout, stderr, err ? (err.code || 1) : 0);
  });
}

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { language, files } = req.body || {};
  if (!language || !files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'language and files are required' });
  }

  runInTmp(language, files, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(result);
  });
};
