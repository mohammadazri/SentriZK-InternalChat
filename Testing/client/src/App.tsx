import { useState, useEffect, useCallback } from 'react';
import type { TestDefinition, TestCategory } from './types';
import { CATEGORY_META } from './types';
import { useTestRunner } from './hooks/useTestRunner';
import TestSection from './components/TestSection';
import LiveTerminal from './components/LiveTerminal';
import SummaryBar from './components/SummaryBar';

const CATEGORY_ORDER: TestCategory[] = ['CONFIDENTIALITY', 'INTEGRITY', 'AVAILABILITY', 'ML'];

// ── Backend URL (shown in header) ─────────────────────────────────────────────
const BACKEND_HOST = 'backend.sentrizk.me';

export default function App() {
  const [tests,   setTests]   = useState<TestDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Load test catalog from server ─────────────────────────────────
  useEffect(() => {
    fetch('/api/tests')
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json() as Promise<TestDefinition[]>;
      })
      .then((data) => { setTests(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const { states, globalLogs, isRunningAll, runTest, runAll, exportResults, resetAll } =
    useTestRunner(tests);

  // ── Group tests by category ────────────────────────────────────────
  const grouped = CATEGORY_ORDER.reduce<Record<TestCategory, TestDefinition[]>>(
    (acc, cat) => {
      acc[cat] = tests.filter((t) => t.category === cat);
      return acc;
    },
    {} as Record<TestCategory, TestDefinition[]>
  );

  const clearTerminal = useCallback(() => resetAll(), [resetAll]);
  const anyRunning    = Object.values(states).some((s) => s.status === 'running') || isRunningAll;

  // ── Loading & error states ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
        <span style={{ fontSize:32, fontFamily:'var(--font-mono)' }}>[ SYS ]</span>
        <p style={{ color:'var(--txt-secondary)', fontFamily:'var(--font-mono)' }}>Connecting to test runner…</p>
        <span className="spinner" style={{ width:24, height:24, borderWidth:3, color:'var(--clr-conf)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
        <span style={{ fontSize:32, color:'var(--clr-fail)' }}>!</span>
        <p style={{ color:'var(--clr-fail)', fontWeight:600 }}>Cannot reach test server</p>
        <p style={{ color:'var(--txt-secondary)', fontSize:13 }}>Make sure the server is running: <code style={{ fontFamily:'var(--font-mono)', color:'var(--clr-conf)' }}>cd Testing/server && npm start</code></p>
        <p style={{ color:'var(--txt-muted)', fontSize:12 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>[ RETRY ]</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-brand">
          <span className="header-shield" style={{fontFamily:'var(--font-mono)'}}>[S_ZK]</span>
          <div className="header-title">
            <h1>SentriZK Workspace</h1>
            <p>Enterprise Assurance Suite</p>
          </div>
        </div>

        <div className="header-right">
          <span className="backend-badge">
            <span className="dot" />
            {BACKEND_HOST}
          </span>
        </div>
      </header>

      {/* ── Desktop Workspace ──────────────────────────────────────── */}
      <div className="workspace">
        {/* ── Left Sidebar (Master) ────────────────────────────────── */}
        <aside className="sidebar">
          {CATEGORY_ORDER.map((cat) => {
            const catTests = grouped[cat] ?? [];
            if (catTests.length === 0) return null;
            return (
              <TestSection
                key={cat}
                category={cat}
                tests={catTests}
                states={states}
                onRun={(id) => runTest(id)}
                disabled={anyRunning}
              />
            );
          })}
        </aside>

        {/* ── Right Pane (Detail) ──────────────────────────────────── */}
        <main className="main-pane">
          <SummaryBar
            states={states}
            isRunningAll={isRunningAll}
            onRunAll={runAll}
            onReset={resetAll}
            onExport={exportResults}
          />

          <LiveTerminal
            logs={globalLogs}
            onClear={clearTerminal}
          />
        </main>
      </div>
    </div>
  );
}
