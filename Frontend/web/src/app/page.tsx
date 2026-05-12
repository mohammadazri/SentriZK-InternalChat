import Link from 'next/link';
import styles from './page.module.css';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <div className={styles.container}>
      {/* Background ambient glows */}
      <div className={styles.ambientOrb1}></div>
      <div className={styles.ambientOrb2}></div>
      <div className={styles.ambientOrb3}></div>

      <div className={styles.navbar}>
        <div className={styles.navLogo}>
          <img src="/logo.png" alt="SentriZK Logo" />
          <span>SentriZK</span>
        </div>
        <ThemeToggle />
      </div>

      <main className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.pulseDot}></span>
          System Online • v1.0.5
        </div>

        <h1 className={styles.title}>
          Zero-Knowledge <br />
          <span className={styles.gradientText}>Authenticated Internal Chat</span>
        </h1>
        
        <p className={styles.subtitle}>
          Secure your SME communications. No passwords stored. <br />
          On-device AI threat detection with unbreakable end-to-end encryption.
        </p>

        <div className={styles.actions}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className={styles.primaryBtn}>
              <div className={styles.btnGlow}></div>
              <span>Launch Portal</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </Link>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button className={styles.secondaryBtn}>
              Create Identity
            </button>
          </Link>
          <Link href="/diagrams.html" style={{ textDecoration: 'none' }}>
            <button className={styles.tertiaryBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6M2 15h10M6 12v6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View Architecture
            </button>
          </Link>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}>🔐</div>
            <h3>ZKP Auth</h3>
            <p>Groth16 proofs & Poseidon hashing. Zero passwords stored on servers.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}>🤖</div>
            <h3>Edge AI</h3>
            <p>On-device TensorFlow Lite model detects phishing prior to encryption.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}>🛡️</div>
            <h3>E2E Encryption</h3>
            <p>Signal Protocol with Double Ratchet ensuring absolute forward secrecy.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
