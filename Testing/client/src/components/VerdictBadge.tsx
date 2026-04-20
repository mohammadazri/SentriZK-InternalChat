import type { TestStatus } from '../types';

interface VerdictBadgeProps {
  status: TestStatus;
}

const STATUS_LABEL: Record<TestStatus, string> = {
  idle:    '— waiting',
  running: 'running...',
  passed:  '✅ pass',
  failed:  '❌ fail',
  skipped: '⚡ skipped',
};

export default function VerdictBadge({ status }: VerdictBadgeProps) {
  return (
    <span className={`verdict-badge verdict-${status}`}>
      {status === 'running' && <span className="spinner" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
