import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface LiveTerminalProps {
  logs:     LogEntry[];
  onClear:  () => void;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

function logClass(entry: LogEntry): string {
  if (entry.type === 'VERDICT') {
    return entry.passed === true ? 'log-VERDICT verdict-pass' :
           entry.passed === false ? 'log-VERDICT verdict-fail' :
           'log-VERDICT verdict-skip';
  }
  return `log-${entry.type}`;
}

export default function LiveTerminal({ logs, onClear }: LiveTerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const copyToClipboard = () => {
    const text = logs.map((l) => `[${fmtTime(l.timestamp)}] [${l.type}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="terminal-wrapper">
        {/* macOS-style top bar */}
        <div className="terminal-topbar">

          <span className="terminal-title">
            telemetry_console ~ /logs ({logs.length})
          </span>
          <div className="terminal-actions">
            <button className="term-btn" onClick={copyToClipboard} id="btn-copy-terminal">
              Copy Output
            </button>
            <button className="term-btn" onClick={onClear} id="btn-clear-terminal">
              Clear Console
            </button>
          </div>
        </div>

        {/* Log body */}
        <div className="terminal-body" ref={bodyRef}>
          {logs.length === 0 ? (
            <div className="terminal-empty">
              <span className="empty-icon" style={{fontFamily:'var(--font-mono)'}}>[ AWAITING_TELEMETRY ]</span>
              <p>Run a module to inject payload and capture stdout.</p>
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className={`term-line ${logClass(entry)}`}>
                <span className="term-ts">{fmtTime(entry.timestamp)}</span>
                <span className="term-type">{entry.type}</span>
                <span className="term-msg">{entry.msg}</span>
              </div>
            ))
          )}
        </div>
    </div>
  );
}
