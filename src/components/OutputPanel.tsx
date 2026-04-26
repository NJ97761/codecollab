import { useEffect, useRef, useState } from 'react';
import {
  Play, X, Trash2, ChevronDown, ChevronUp,
  Terminal, Globe, CheckCircle2, XCircle, Loader2, Clock,
} from 'lucide-react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { runCode, RunResult } from '../utils/runCode';

interface OutputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** External trigger — increment to run */
  runTrigger: number;
  /** Called when execution finishes (success or error) */
  onRunComplete: () => void;
}

type ExecStatus = 'idle' | 'running' | 'success' | 'error';

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', c: 'C', go: 'Go', rust: 'Rust',
  ruby: 'Ruby', php: 'PHP', sql: 'SQL', html: 'HTML',
};

export function OutputPanel({ isOpen, onClose, runTrigger, onRunComplete }: OutputPanelProps) {
  const { state } = useFileSystem();
  const files = state.room?.files || [];
  const language = state.room?.language || 'javascript';

  const [result, setResult] = useState<(RunResult & { srcdoc?: string }) | null>(null);
  const [status, setStatus] = useState<ExecStatus>('idle');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);
  const prevTrigger = useRef(0);
  const isHtml = language === 'html';

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result]);

  // Run when trigger increments
  useEffect(() => {
    if (runTrigger === 0 || runTrigger === prevTrigger.current) return;
    prevTrigger.current = runTrigger;
    handleRun();
  }, [runTrigger]);

  const handleRun = async () => {
    if (!state.room) return;
    setStatus('running');
    setResult(null);
    setIsCollapsed(false);
    try {
      const res = await runCode(language, files);
      setResult(res);
      setStatus(res.exitCode === 0 ? 'success' : 'error');
    } catch (err: any) {
      setResult({ stdout: '', stderr: err.message, exitCode: 1, runtimeMs: 0, mode: 'server' });
      setStatus('error');
    } finally {
      onRunComplete();
    }
  };

  const handleClear = () => {
    setResult(null);
    setStatus('idle');
  };

  if (!isOpen) return null;

  const panelHeight = isCollapsed ? '42px' : isHtml && result?.srcdoc ? '400px' : '260px';

  const statusIcon =
    status === 'running' ? <Loader2 size={14} className="animate-spin text-indigo-400" /> :
    status === 'success' ? <CheckCircle2 size={14} className="text-emerald-400" /> :
    status === 'error'   ? <XCircle size={14} className="text-red-400" /> :
                           <Terminal size={14} className="text-slate-500" />;

  const statusLabel =
    status === 'running' ? 'Running…' :
    status === 'success' ? `Done in ${result?.runtimeMs}ms` :
    status === 'error'   ? `Error (exit ${result?.exitCode})` :
                           'Output';

  return (
    <div
      className="border-t border-slate-800/60 bg-slate-950 flex flex-col transition-all duration-300 flex-shrink-0"
      style={{ height: panelHeight }}
    >
      {/* ── Panel Header ── */}
      <div className="flex items-center gap-2 px-4 h-[42px] border-b border-slate-800/40 flex-shrink-0 bg-slate-900/50">
        {/* Left: status + lang */}
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon}
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{statusLabel}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700/50 font-mono whitespace-nowrap">
            {isHtml ? <Globe size={10} className="inline mr-1" /> : null}
            {LANG_LABELS[language] || language}
          </span>
          {result && !isHtml && (
            <div className="flex items-center gap-1 text-[10px] text-slate-600">
              <Clock size={10} />
              <span>{result.runtimeMs}ms</span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Run */}
          <button
            id="output-run-btn"
            onClick={handleRun}
            disabled={status === 'running'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {status === 'running'
              ? <Loader2 size={12} className="animate-spin" />
              : <Play size={12} className="fill-current" />}
            Run
          </button>

          {/* Clear */}
          <button
            id="output-clear-btn"
            onClick={handleClear}
            title="Clear output"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
          >
            <Trash2 size={13} />
          </button>

          {/* Collapse / Expand */}
          <button
            id="output-collapse-btn"
            onClick={() => setIsCollapsed(c => !c)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
          >
            {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Close */}
          <button
            id="output-close-btn"
            onClick={onClose}
            title="Close panel"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Panel Body ── */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden flex">
          {/* HTML preview */}
          {isHtml && result?.srcdoc ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/30 text-[10px] text-slate-500">
                <Globe size={10} className="text-emerald-400" />
                <span>Live Preview</span>
              </div>
              <iframe
                id="html-preview-frame"
                title="HTML Preview"
                srcDoc={result.srcdoc}
                sandbox="allow-scripts"
                className="flex-1 w-full bg-white"
              />
            </div>
          ) : (
            /* Console output */
            <div className="flex-1 overflow-hidden flex flex-col font-mono text-xs">
              {/* Idle / no result */}
              {!result && status === 'idle' && (
                <div className="flex-1 flex items-center justify-center text-slate-600">
                  <div className="text-center">
                    <Terminal size={24} className="mx-auto mb-2 opacity-30" />
                    <p>Click <strong className="text-slate-500">Run</strong> to execute your code</p>
                  </div>
                </div>
              )}

              {/* Running spinner */}
              {status === 'running' && (
                <div className="flex-1 flex items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  <span>Executing {LANG_LABELS[language] || language} code…</span>
                </div>
              )}

              {/* Output */}
              {result && status !== 'running' && (
                <pre
                  ref={outputRef}
                  className="flex-1 overflow-auto p-4 leading-relaxed text-[11px] whitespace-pre-wrap break-words"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
                >
                  {result.stdout && (
                    <span className="text-slate-200">{result.stdout}</span>
                  )}
                  {result.stderr && (
                    <span className="text-red-400">{result.stdout ? '\n' : ''}{result.stderr}</span>
                  )}
                  {!result.stdout && !result.stderr && (
                    <span className="text-slate-600 italic">No output produced.</span>
                  )}
                  {/* Exit code footer */}
                  <span className={`block mt-3 pt-2 border-t border-slate-800/50 text-[10px] ${
                    result.exitCode === 0 ? 'text-emerald-500/60' : 'text-red-500/60'
                  }`}>
                    Process exited with code {result.exitCode}  ·  {result.runtimeMs}ms
                  </span>
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
