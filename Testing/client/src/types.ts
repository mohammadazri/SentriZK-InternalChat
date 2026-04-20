// Shared TypeScript types for the dashboard

export type TestCategory = 'CONFIDENTIALITY' | 'INTEGRITY' | 'AVAILABILITY' | 'ML';
export type TestStatus   = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

export type LogType =
  | 'ATTACK' | 'RESULT' | 'CHECK' | 'VERIFY' | 'EXPLAIN'
  | 'VERDICT' | 'ERROR'  | 'LOG'   | 'FAIL'   | 'SKIP'
  | 'START_TEST' | 'DONE' | 'SUMMARY' | 'INFO';

export interface LogEntry {
  type:      LogType;
  msg:       string;
  testId?:   string;
  passed?:   boolean | null;
  timestamp: number;
}

export interface TestDefinition {
  id:          string;
  name:        string;
  category:    TestCategory;
  description: string;
}

export interface TestState {
  status:  TestStatus;
  logs:    LogEntry[];
}

export type TestStateMap = Record<string, TestState>;

export const CATEGORY_META: Record<TestCategory, { label: string; icon: string; theme: string }> = {
  CONFIDENTIALITY: { label: 'CONFIDENTIALITY', icon: '[C]', theme: 'conf-theme'  },
  INTEGRITY:       { label: 'INTEGRITY',       icon: '[I]', theme: 'integ-theme' },
  AVAILABILITY:    { label: 'AVAILABILITY',    icon: '[A]', theme: 'avail-theme' },
  ML:              { label: 'ML DETECTION',    icon: '[M]', theme: 'ml-theme'    },
};
