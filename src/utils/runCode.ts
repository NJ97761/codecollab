import { FileItem } from '../types';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
  mode: 'server' | 'html';
}

// On Vercel: VITE_SERVER_URL is not set → use '' (same-origin → hits /api/run serverless fn)
// Locally: VITE_SERVER_URL = 'http://localhost:3001' → hits the Express server
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

// ─── HTML iframe build ────────────────────────────────────────────────────────
export function buildHtmlSrcdoc(files: FileItem[]): string {
  const html  = files.find(f => f.name.endsWith('.html'));
  const css   = files.filter(f => f.name.endsWith('.css'));
  const js    = files.filter(f => f.name.endsWith('.js') && !f.name.endsWith('.min.js'));

  const baseHtml = html?.content || '<html><body><p>No HTML file found.</p></body></html>';

  const styleBlock  = css.map(f => `<style>/* ${f.name} */\n${f.content}</style>`).join('\n');
  const scriptBlock = js.map(f  => `<script>/* ${f.name} */\n${f.content}<\/script>`).join('\n');

  let result = baseHtml;
  if (styleBlock) {
    result = result.includes('</head>')
      ? result.replace('</head>', `${styleBlock}\n</head>`)
      : `${styleBlock}\n${result}`;
  }
  if (scriptBlock) {
    result = result.includes('</body>')
      ? result.replace('</body>', `${scriptBlock}\n</body>`)
      : `${result}\n${scriptBlock}`;
  }
  return result;
}

// ─── Server-side execution (via /api/run) ─────────────────────────────────────
export async function runOnServer(
  language: string,
  files: FileItem[],
): Promise<RunResult> {
  const startTime = Date.now();
  try {
    const res = await fetch(`${SERVER_URL}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, files: files.map(f => ({ name: f.name, content: f.content })) }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return {
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      exitCode: data.exitCode ?? 0,
      runtimeMs: data.runtimeMs ?? (Date.now() - startTime),
      mode: 'server',
    };
  } catch (err: any) {
    return {
      stdout: '',
      stderr: err.message || 'Execution failed.',
      exitCode: 1,
      runtimeMs: Date.now() - startTime,
      mode: 'server',
    };
  }
}

// ─── Main entry ───────────────────────────────────────────────────────────────
export async function runCode(
  projectLanguage: string,
  files: FileItem[],
): Promise<RunResult & { srcdoc?: string }> {
  if (projectLanguage === 'html') {
    return {
      stdout: '✅ HTML rendered in preview.',
      stderr: '',
      exitCode: 0,
      runtimeMs: 0,
      mode: 'html',
      srcdoc: buildHtmlSrcdoc(files),
    };
  }
  return runOnServer(projectLanguage, files);
}
