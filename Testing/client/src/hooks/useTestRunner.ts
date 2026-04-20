// useTestRunner — manages SSE connections and test state

import { useState, useCallback, useRef } from 'react';
import type { TestDefinition, TestState, TestStateMap, LogEntry } from '../types';

const API = '/api';

function makeInitialState(tests: TestDefinition[]): TestStateMap {
  return Object.fromEntries(tests.map((t) => [t.id, { status: 'idle', logs: [] }]));
}

export function useTestRunner(tests: TestDefinition[]) {
  const [states, setStates] = useState<TestStateMap>(() => makeInitialState(tests));
  const [globalLogs, setGlobalLogs]   = useState<LogEntry[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const activeEsRef = useRef<EventSource | null>(null);

  /** Update a single test's state immutably */
  const updateTest = useCallback((testId: string, patch: Partial<TestState>) => {
    setStates((prev) => ({
      ...prev,
      [testId]: { ...prev[testId], ...patch },
    }));
  }, []);

  /** Append a log entry to a test and to the global log */
  const appendLog = useCallback((testId: string, entry: LogEntry) => {
    setStates((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        logs: [...prev[testId].logs, entry],
      },
    }));
    setGlobalLogs((prev) => [...prev.slice(-500), entry]); // keep last 500
  }, []);

  /** Parse a raw SSE event into a LogEntry and handle side-effects */
  const handleEvent = useCallback((testId: string, raw: string) => {
    let data: LogEntry & { passed?: boolean | null };
    try { data = JSON.parse(raw); } catch { return; }

    const entry: LogEntry = {
      type:      data.type,
      msg:       data.msg ?? '',
      testId,
      passed:    data.passed,
      timestamp: data.timestamp ?? Date.now(),
    };

    appendLog(testId, entry);

    if (data.type === 'DONE') {
      const status =
        data.passed === true  ? 'passed'  :
        data.passed === false ? 'failed'  :
        data.passed === null  ? 'skipped' : 'failed';
      updateTest(testId, { status });
      if (activeEsRef.current) {
        activeEsRef.current.close();
      }
    }
  }, [appendLog, updateTest]);

  /** Run a single test */
  const runTest = useCallback((testId: string) => {
    if (activeEsRef.current) { activeEsRef.current.close(); }

    updateTest(testId, { status: 'running', logs: [] });

    const es = new EventSource(`${API}/stream/${testId}`);
    activeEsRef.current = es;

    es.onmessage = (e) => handleEvent(testId, e.data);
    es.onerror   = () => {
      es.close();
      setStates((prev) => {
        if (prev[testId]?.status === 'running') {
          return { ...prev, [testId]: { ...prev[testId], status: 'failed' } };
        }
        return prev;
      });
    };
  }, [updateTest, handleEvent]);

  /** Run all tests sequentially */
  const runAll = useCallback(() => {
    if (isRunningAll) return;
    if (activeEsRef.current) { activeEsRef.current.close(); }

    // Reset all states
    setStates(makeInitialState(tests));
    setGlobalLogs([]);
    setIsRunningAll(true);

    const es = new EventSource(`${API}/run-all`);
    activeEsRef.current = es;

    es.onmessage = (e) => {
      let data: LogEntry & { passed?: boolean | null; testId?: string };
      try { data = JSON.parse(e.data); } catch { return; }

      const tid = data.testId ?? 'summary';

      if (data.type === 'SUMMARY') {
        setIsRunningAll(false);
        es.close();
        // Add summary to global logs
        const entry: LogEntry = { type: 'SUMMARY', msg: data.msg ?? '', testId: 'summary', timestamp: Date.now() };
        setGlobalLogs((prev) => [...prev, entry]);
        return;
      }

      if (data.type === 'START_TEST') {
        updateTest(tid, { status: 'running', logs: [] });
      }

      const entry: LogEntry = {
        type:      data.type,
        msg:       data.msg ?? '',
        testId:    tid,
        passed:    data.passed,
        timestamp: data.timestamp ?? Date.now(),
      };

      if (tid !== 'summary') {
        setStates((prev) => ({
          ...prev,
          [tid]: {
            ...prev[tid] ?? { status: 'running', logs: [] },
            logs: [...(prev[tid]?.logs ?? []), entry],
          },
        }));
      }

      setGlobalLogs((prev) => [...prev.slice(-1000), entry]);

      if (data.type === 'DONE' && tid !== 'summary') {
        const status =
          data.passed === true  ? 'passed'  :
          data.passed === false ? 'failed'  :
          data.passed === null  ? 'skipped' : 'failed';
        updateTest(tid, { status });
      }
    };

    es.onerror = () => {
      es.close();
      setIsRunningAll(false);
    };
  }, [isRunningAll, tests, updateTest]);

  /** Export results as JSON */
  const exportResults = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      backend:     window.location.hostname,
      results:     Object.entries(states).map(([id, s]) => ({
        testId:  id,
        status:  s.status,
        logCount: s.logs.length,
        verdict: s.logs.find((l) => l.type === 'VERDICT')?.msg ?? '',
      })),
      summary: {
        passed:  Object.values(states).filter(s => s.status === 'passed').length,
        failed:  Object.values(states).filter(s => s.status === 'failed').length,
        skipped: Object.values(states).filter(s => s.status === 'skipped').length,
        total:   Object.keys(states).length,
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sentrizk_security_report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [states]);

  const resetAll = useCallback(() => {
    if (activeEsRef.current) { activeEsRef.current.close(); }
    setStates(makeInitialState(tests));
    setGlobalLogs([]);
    setIsRunningAll(false);
  }, [tests]);

  return { states, globalLogs, isRunningAll, runTest, runAll, exportResults, resetAll };
}
