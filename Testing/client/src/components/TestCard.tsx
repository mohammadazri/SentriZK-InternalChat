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
    <div className={`test-card tc-${state.status}`} id={`card-${test.id}`}>
      <div className="card-top">
        <span className="card-name">{test.name}</span>
        <span className="card-id">{test.id}</span>
      </div>

      <p className="card-desc">{test.description}</p>

      <div className="card-bottom">
        <VerdictBadge status={state.status} />
        <button
          id={`run-${test.id}`}
          className="btn-run-test"
          onClick={() => onRun(test.id)}
          disabled={disabled || isRunning}
        >
          {isRunning ? 'Running…' : state.status === 'idle' ? '▶ Run' : '↺ Re-run'}
        </button>
      </div>
    </div>
  );
}
