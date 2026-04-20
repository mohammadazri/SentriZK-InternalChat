import type { TestStateMap } from '../types';

interface SummaryBarProps {
  states:      TestStateMap;
  isRunningAll: boolean;
  onRunAll:    () => void;
  onReset:     () => void;
  onExport:    () => void;
}

export default function SummaryBar({ states, isRunningAll, onRunAll, onReset, onExport }: SummaryBarProps) {
  const all     = Object.values(states);
  const total   = all.length;
  const passed  = all.filter((s) => s.status === 'passed').length;
  const failed  = all.filter((s) => s.status === 'failed').length;
  const skipped = all.filter((s) => s.status === 'skipped').length;
  const done    = passed + failed + skipped;
  const pct     = total > 0 ? Math.round((passed / total) * 100) : 0;
  const running = all.some((s) => s.status === 'running');

  return (
    <div className="summary-bar">
      <div className="summary-counts">
        <span className="summary-count pass">
          <span className="num">{passed}</span> Passed
        </span>
        <span className="summary-count fail">
          <span className="num">{failed}</span> Failed
        </span>
        <span className="summary-count skip">
          <span className="num">{skipped}</span> Skipped
        </span>
        <span className="summary-count total">
          <span className="num">{done}/{total}</span> Done
        </span>
      </div>

      <div className="progress-track flex-1">
        <div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <span style={{ fontSize: 13, color: 'var(--txt-muted)', minWidth: 40 }}>
        {pct}%
      </span>

      <button
        id="btn-run-all"
        className="btn btn-primary"
        onClick={onRunAll}
        disabled={isRunningAll || running}
      >
        {isRunningAll || running ? (
          <><span className="spinner" /> Running…</>
        ) : (
          '▶ Run All Tests'
        )}
      </button>

      <button id="btn-reset" className="btn btn-ghost" onClick={onReset} disabled={isRunningAll || running}>
        ↺ Reset
      </button>

      <button
        id="btn-export"
        className="btn btn-export"
        onClick={onExport}
        disabled={done === 0}
      >
        📄 Export Report
      </button>
    </div>
  );
}
