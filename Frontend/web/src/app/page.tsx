import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect x="10" y="20" width="60" height="40" rx="8" fill="white" opacity="0.95"/>
            <path d="M40 15L25 25V40C25 48 40 55 40 55C40 55 55 48 55 40V25L40 15Z" fill="url(#shieldGrad)" stroke="white" strokeWidth="2"/>
            <path d="M35 40L38 43L45 36" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="shieldGrad" x1="25" y1="15" x2="55" y2="55" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa"/>
                <stop offset="1" stopColor="#a78bfa"/>
              </linearGradient>
            </defs>
          </svg>
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
                <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </Link>
          <Link href="/login">
            <button className={styles.secondaryBtn}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3V10M10 10L7 7M10 10L13 7M5 13C5 15.7614 7.23858 18 10 18C12.7614 18 15 15.7614 15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
