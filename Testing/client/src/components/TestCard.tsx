import type { TestDefinition, TestState } from '../types';
import VerdictBadge from './VerdictBadge';

interface TestCardProps {
  test:     TestDefinition;
  state:    TestState;
  onRun:    (id: string) => void;
  disabled: boolean;
}

export default function TestCard({ test, state, onRun, disabled }: TestCardProps) {
  const isRunning = state.status === 'running';

  return (
    <div className={`test-row tc-${state.status}`} id={`card-${test.id}`} onClick={() => !disabled && !isRunning && onRun(test.id)}>
      <div className="row-top">
        <span className="row-name">{test.name}</span>
        <VerdictBadge status={state.status} />
      </div>
      
      <div className="row-actions">
        <button
          id={`run-${test.id}`}
          className="btn-run-small"
          onClick={(e) => { e.stopPropagation(); onRun(test.id); }}
          disabled={disabled || isRunning}
        >
          {isRunning ? '...' : '▶ Exec'}
        </button>
      </div>
    </div>
  );
}
