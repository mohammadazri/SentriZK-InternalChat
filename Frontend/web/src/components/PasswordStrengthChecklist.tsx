import React from 'react';
import { Check, X } from 'lucide-react';
import styles from './PasswordStrengthChecklist.module.css';

interface PasswordStrengthChecklistProps {
  password?: string;
}

export default function PasswordStrengthChecklist({ password = '' }: PasswordStrengthChecklistProps) {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character (@$!%*?&)', met: /[@$!%*?&]/.test(password) },
  ];

  if (!password && password.length === 0) {
    return null; // Only show when user starts typing something
  }

  return (
    <div className={styles.container}>
      <p className={styles.title}>Password Requirements:</p>
      <div className={styles.grid}>
        {rules.map((rule, idx) => (
          <div key={idx} className={`${styles.ruleRow} ${rule.met ? styles.met : styles.unmet}`}>
            {rule.met ? <Check size={14} /> : <X size={14} />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
