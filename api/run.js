// Vercel Serverless Function — POST /api/run
// JavaScript runs natively via Node.js. All other languages use Wandbox (free, no auth).

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

// ─── Wandbox helpers ──────────────────────────────────────────────────────────
let cachedCompilers = null;

const WANDBOX_LANG = {
  typescript: 'TypeScript',
  python:     'CPython',
  java:       'Java',
  cpp:        'C++',
  c:          'C',
  go:         'Go',
  rust:       'Rust',
  ruby:       'Ruby',
  php:        'PHP',
};

const LANG_EXT = {
  javascript: '.js', typescript: '.ts', python: '.py',
  java: '.java', cpp: '.cpp', c: '.c', go: '.go',
  rust: '.rs', ruby: '.rb', php: '.php',
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname,
      method: 'POST', timeout: 30000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getCompiler(language) {
  if (!cachedCompilers) {
    cachedCompilers = await httpsGet('https://wandbox.org/api/list.json');
  }
  const target = WANDBOX_LANG[language];
  if (!target) return null;
  const matches = cachedCompilers.filter(c =>
    c.language && c.language.toLowerCase() === target.toLowerCase()
  );
  if (!matches.length) return null;
  const stable = matches.filter(c => !c.name.includes('head'));
  return (stable.length ? stable[stable.length - 1] : matches[matches.length - 1])?.name || null;
}

async function runWithWandbox(language, files) {
  const startTime = Date.now();
  const compiler = await getCompiler(language);
  if (!compiler) {
    return { stdout: '', stderr: `'${language}' is not supported.`, exitCode: 1, runtimeMs: 0 };
  }
  const ext = LANG_EXT[language] || '';
  const mainFile = files.find(f => f.name.endsWith(ext)) || files[0];
  const others = files.filter(f => f !== mainFile && (f.content || '').trim());
  const result = await httpsPost('https://wandbox.org/api/compile.json', {
    compiler,
    code: mainFile?.content || '',
    codes: others.map(f => ({ file: f.name, code: f.content || '' })),
    stdin: '',
  });
  const stdout = result.program_output || '';
  const stderr = [result.compiler_error, result.program_error].filter(Boolean).join('\n');
  const exitCode = parseInt(result.status, 10);
  return { stdout, stderr, exitCode: isNaN(exitCode) ? 0 : exitCode, runtimeMs: Date.now() - startTime };
}

// ─── Native JS fast path ──────────────────────────────────────────────────────
function runJsNative(files, callback) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-'));
  const startTime = Date.now();
  for (const f of files) fs.writeFileSync(path.join(tmpDir, f.name), f.content || '');
  const main = files.find(f => f.name.endsWith('.js')) || files[0];
  exec(`node "${path.join(tmpDir, main.name)}"`, { timeout: 10000, cwd: tmpDir }, (err, stdout, stderr) => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    callback(null, { stdout: stdout || '', stderr: stderr || '', exitCode: err ? (err.code || 1) : 0, runtimeMs: Date.now() - startTime });
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { language, files } = req.body || {};
  if (!language || !Array.isArray(files)) return res.status(400).json({ error: 'language and files required' });

  if (language === 'javascript') {
    return new Promise(resolve => {
      runJsNative(files, (err, result) => {
        res.status(err ? 500 : 200).json(err ? { error: err.message } : result);
        resolve();
      });
    });
  }

  if (language === 'sql' || language === 'html') {
    return res.status(200).json({ stdout: '', stderr: `'${language}' runs client-side only.`, exitCode: 0, runtimeMs: 0 });
  }

  try {
    const result = await runWithWandbox(language, files);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
