import type { TestStatus } from '../types';

interface VerdictBadgeProps {
  status: TestStatus;
}

const STATUS_LABEL: Record<TestStatus, string> = {
  idle:    'WAITING',
  running: 'SCANNING',
  passed:  'PASSED',
  failed:  'FAILED',
  skipped: 'SKIPPED',
};

export default function VerdictBadge({ status }: VerdictBadgeProps) {
  return (
    <span className={`verdict-badge verdict-${status}`}>
      <span className="led-dot" />
      {status === 'running' && <span className="spinner" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
