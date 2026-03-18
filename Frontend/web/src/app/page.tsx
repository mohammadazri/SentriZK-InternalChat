import Link from 'next/link';
import styles from './page.module.css';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <ThemeToggle />
      <div className={styles.hero}>
        <div className={styles.logo} style={{ background: "transparent", border: "none" }}>
          <img src="/logo.png" alt="SentriZK Logo" style={{ width: 80, height: 80, objectFit: "contain" }} />
        </div>
        <h1 className={styles.title}>SentriZK</h1>
        <p className={styles.subtitle}>
          Next-generation authentication powered by Zero-Knowledge Proofs.
          Secure, private, and passwordless authentication using cutting-edge cryptography.
        </p>
        <div className={styles.actions}>
          <Link href="/register">
            <button className={styles.primaryBtn}>
              Get Started
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </Link>
          <Link href="/login">
            <button className={styles.secondaryBtn}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3V10M10 10L7 7M10 10L13 7M5 13C5 15.7614 7.23858 18 10 18C12.7614 18 15 15.7614 15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign In
            </button>
          </Link>
        </div>
        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔐</div>
            <h3>Zero-Knowledge</h3>
            <p>Prove authentication without revealing your password</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3>Military-Grade</h3>
            <p>Poseidon hash with Groth16 proof system</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📱</div>
            <h3>Device-Bound</h3>
            <p>Deterministic wallet tied to your device</p>
          </div>
        </div>
      </div>
    </div>
  );
}
