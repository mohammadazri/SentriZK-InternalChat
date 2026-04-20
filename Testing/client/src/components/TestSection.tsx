import { useState } from 'react';
import type { TestCategory, TestDefinition, TestStateMap } from '../types';
import { CATEGORY_META } from '../types';
import TestCard from './TestCard';

interface TestSectionProps {
  category: TestCategory;
  tests:    TestDefinition[];
  states:   TestStateMap;
  onRun:    (id: string) => void;
  disabled: boolean;
}

export default function TestSection({ category, tests, states, onRun, disabled }: TestSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta     = CATEGORY_META[category];
  const passed   = tests.filter((t) => states[t.id]?.status === 'passed').length;
  const total    = tests.length;

  return (
    <section className={`test-section ${meta.theme}`} id={`section-${category.toLowerCase()}`}>
      <div className="section-header clickable" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="section-title">
          <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>▸</span>
          <span className="section-icon">{meta.icon}</span>
          <span className="section-label">{meta.label}</span>
        </div>
        <span className="section-badge">
          {passed}/{total}
        </span>
      </div>

      <div className={`section-content ${isExpanded ? 'active' : 'hidden'}`}>
        {tests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            state={states[test.id] ?? { status: 'idle', logs: [] }}
            onRun={onRun}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}
