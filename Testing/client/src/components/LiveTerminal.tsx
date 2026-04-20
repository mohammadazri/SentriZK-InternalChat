import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface LiveTerminalProps {
  logs:     LogEntry[];
  onClear:  () => void;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

function sanitizeMsg(type: string, msg: string) {
  // Strip emojis commonly used in backend modules
  let cleanMsg = msg
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{25B6}\u{2705}\u{274C}\u{26A0}\u{FE0F}]/gu, '')
    .trim();
  
  // Clean up dangling hyphens left from emoji removal
  if (cleanMsg.startsWith('—')) cleanMsg = cleanMsg.substring(1).trim();
  if (cleanMsg.startsWith('-')) cleanMsg = cleanMsg.substring(1).trim();

  let prefix = '';
  switch (type) {
    case 'ATTACK':     prefix = '[+]'; break;
    case 'RESULT':     prefix = '[>]'; break;
    case 'CHECK':      prefix = '[?]'; break;
    case 'EXPLAIN':    prefix = '[i]'; break;
    case 'START_TEST': prefix = '[~]'; break;
    case 'INFO':       prefix = '[@]'; break;
    case 'VERIFY':     prefix = '[*]'; break;
    case 'LOG':        prefix = '[-]'; break;
    case 'ERROR':
    case 'FAIL':       prefix = '[!]'; break;
    case 'VERDICT':
      if (cleanMsg.toUpperCase().includes('PASS')) prefix = '[ok]';
      else if (cleanMsg.toUpperCase().includes('FAIL')) prefix = '[x]';
      else prefix = '[-]';
      break;
    case 'SUMMARY':    prefix = '[=]'; break;
  }
  
  return prefix ? `${prefix} ${cleanMsg}` : cleanMsg;
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
                <span className="term-msg">{sanitizeMsg(entry.type, entry.msg)}</span>
              </div>
            ))
          )}
        </div>
    </div>
  );
}
