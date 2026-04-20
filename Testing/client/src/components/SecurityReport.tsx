import type { TestDefinition, TestStateMap, TestCategory } from '../types';
import { CATEGORY_META } from '../types';
import '../report.css';

interface SecurityReportProps {
  tests:  TestDefinition[];
  states: TestStateMap;
}

export default function SecurityReport({ tests, states }: SecurityReportProps) {
  const generatedAt = new Date().toLocaleString();
  const allStates   = Object.values(states);
  
  const passed  = allStates.filter(s => s.status === 'passed').length;
  const failed  = allStates.filter(s => s.status === 'failed').length;
  const skipped = allStates.filter(s => s.status === 'skipped').length;
  const total   = tests.length;

  const categories: TestCategory[] = ['CONFIDENTIALITY', 'INTEGRITY', 'AVAILABILITY', 'ML'];

  return (
    <div className="security-report">
      {/* ── Page 1: Cover ─────────────────────────────────────────── */}
      <div className="report-cover">
        <div className="logo">SentriZK</div>
        <h1>Enterprise Security Audit Report</h1>
        <p className="subtitle">Consolidated Authentication & Anti-Tamper Assurance Document</p>
        
        <div className="report-meta">
          <div><span>Project:</span> <span>SentriZK Workspace FYP</span></div>
          <div><span>Assessment Date:</span> <span>{generatedAt}</span></div>
          <div><span>Target Environment:</span> <span>Production (backend.sentrizk.me)</span></div>
          <div><span>Security Grade:</span> <span style={{color: failed > 0 ? '#b91c1c' : '#166534', fontWeight: 800}}>{failed > 0 ? 'B - ACTION REQUIRED' : 'A+ - SECURE'}</span></div>
        </div>
      </div>

      {/* ── Page 2: Executive Summary & Risk Matrix ───────────────── */}
      <div className="report-section page-break">
        <h2>1. Executive Summary</h2>
        <p>
          The SentriZK Security Audit evaluated {total} industrial security controls across the primary threat landscape. 
          The infrastructure utilizes Zero-Knowledge Proofs (ZKP) and Hardware-Bound sessions to mitigate identity theft and replay attacks.
        </p>

        <div className="scorecard-grid">
          <div className="score-card"><span className="val">{passed}</span><span className="label">Verified Pass</span></div>
          <div className="score-card" style={{borderColor: failed > 0 ? '#ef4444' : '#e2e8f0'}}><span className="val">{failed}</span><span className="label">Vulnerabilities</span></div>
          <div className="score-card"><span className="val">{total}</span><span className="label">Total Controls</span></div>
        </div>

        <div className="risk-matrix">
          <div>
            <h3>Risk Assessment Matrix</h3>
            <p style={{fontSize: '11px', color: '#64748b'}}>This matrix visualizes the severity of findings based on exploitability (Likelihood) and business impact (Severity).</p>
          </div>
          <div className="matrix-grid">
            <div className="matrix-cell risk-med">M</div><div className="matrix-cell risk-high">H</div><div className="matrix-cell risk-crit">C</div>
            <div className="matrix-cell risk-low">L</div><div className="matrix-cell risk-med">M</div><div className="matrix-cell risk-high">H</div>
            <div className="matrix-cell risk-low">L</div><div className="matrix-cell risk-low">L</div><div className="matrix-cell risk-med">M</div>
          </div>
        </div>
      </div>

      {/* ── Page 3: Internal Secret Incidents (PRO REQUEST) ────────── */}
      <div className="report-section page-break">
        <h2 style={{color: '#991b1b'}}>2. Internal Secret Incidents Audit</h2>
        <p>This section documents sensitive data exposures detected within the source code history and internal monitoring tools.</p>

        <div className="incident-card" style={{ border: '2px solid #fee2e2', borderRadius: '8px', padding: '24px', backgroundColor: '#fef2f2', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>#30486321 — JSON Web Token Leak </span>
            <span className="badge fail">CRITICAL EXPOSURE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '12px' }}>
            <div>
              <strong>Secret Type:</strong> JSON Web Token (HS256)<br />
              <strong>Source:</strong> Testing/server/tests/auth/i5_jwt_forgery.js<br />
              <strong>Detected Date:</strong> Apr 20th, 2026
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>Incident Status:</strong> <span style={{color: '#166534', fontWeight: 800}}>REMEDIATED</span><br />
              <strong>Assignee:</strong> mohamedazri655@gmail.com
            </div>
          </div>

          <div className="evidence-header" style={{ marginTop: '20px' }}>Exposed Token Fragment:</div>
          <div className="evidence-block" style={{ backgroundColor: '#ffffff', border: '1px solid #fee2e2', color: '#991b1b' }}>
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZXZpbF9hZG1pbiJ9.swapped_sig
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid #fee2e2', paddingTop: '16px' }}>
            <h4 style={{ color: '#991b1b', marginTop: 0 }}>Remediation Timeline</h4>
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>✅ <strong>11:41 (Detection):</strong> Secret detected in default branch by automated GitGuardian scanner.</div>
              <div>✅ <strong>11:55 (Impact Assessment):</strong> Blast radius identified as developer testing environment.</div>
              <div>✅ <strong>12:05 (Rotation):</strong> Hardcoded secret replaced with dynamic generation logic.</div>
              <div>✅ <strong>12:06 (Verification):</strong> Incident marked as Resolved after audit confirmation.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page 4+: Detailed Findings ────────────────────────────── */}
      {categories.map((cat) => {
        const catTests = tests.filter(t => t.category === cat);
        const meta = CATEGORY_META[cat];
        if (catTests.length === 0) return null;

        return (
          <div key={cat} className="report-section">
            <h2 style={{ color: '#334155', borderLeft: `8px solid ${meta.theme === 'conf' ? '#3b82f6' : meta.theme === 'intg' ? '#ec4899' : '#f59e0b'}`, paddingLeft: '15px' }}>
              {meta.label} Control Audit
            </h2>

            {catTests.map((test) => {
              const state = states[test.id] || { status: 'idle', logs: [] };
              const verdict = state.logs.find(l => l.type === 'VERDICT')?.msg || 'N/A';
              const explanations = state.logs.filter(l => l.type === 'EXPLAIN');
              const telemetry = state.logs.filter(l => ['TRACE', 'ATTACK', 'RESULT'].includes(l.type));

              return (
                <div key={test.id} className="finding-item">
                  <div className="finding-header">
                    <span className="finding-title">[{test.id}] {test.name}</span>
                    <span className={`badge ${state.status}`}>{state.status.toUpperCase()}</span>
                  </div>

                  <p className="finding-desc">{test.description}</p>

                  {explanations.length > 0 && (
                    <div className="defense-analysis">
                      <h4>Technical Control Review</h4>
                      {explanations.map((exp, idx) => (
                        <div key={idx} style={{marginBottom: '5px'}}>• {exp.msg}</div>
                      ))}
                    </div>
                  )}

                  <div className="evidence-header">Audit Telemetry (Full Trace)</div>
                  <div className="evidence-block">
                    {telemetry.map((l, i) => (
                      <div key={i}>{l.type === 'TRACE' ? '[#]' : l.type === 'ATTACK' ? '[*]' : '[>]'} {l.msg}</div>
                    ))}
                  </div>

                  <div className="audit-verification" style={{marginTop: '15px', fontWeight: 600}}>
                    Audit Verdict: <span style={{color: state.status === 'passed' ? '#166534' : '#b91c1c'}}>{verdict}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="footer" style={{ borderTop: '2px solid #0f172a', marginTop: '60px', paddingTop: '20px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>
        <strong>SENTRIZK PROPRIETARY AND CONFIDENTIAL</strong><br />
        This report was generated by the SentriZK High-Fidelity Test Runner on {generatedAt}. No parts of this audit trace were truncated.
      </div>
    </div>
  );
}
