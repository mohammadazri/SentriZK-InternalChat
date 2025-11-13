"use client";

import React, { useEffect, useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { decryptSaltHex } from "@/lib/saltEncryption";
import { loginUser } from "@/auth/api";
import WalletConnector from "@/components/WalletConnector";
import styles from "./login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [encryptedSalt, setEncryptedSalt] = useState("");
  const [decryptedSaltHex, setDecryptedSaltHex] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check for Mobile Access Token and pre-filled data
  useEffect(() => {
    const checkAuthorization = () => {
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      const userParam = params.get("username");
      const saltParam = params.get("encryptedSalt");

      if (!mat) {
        setIsAuthorized(false);
        setError("Access Denied: This page can only be accessed from the SentriApp mobile application.");
        setIsCheckingAuth(false);
        return;
      }

      // Check if this MAT has already been used
      const usedKey = `mat_used_${mat}`;
      if (sessionStorage.getItem(usedKey)) {
        setIsAuthorized(false);
        setError("This link has already been used. Please request a new link from the mobile app.");
        setIsCheckingAuth(false);
        return;
      }

      // Set authorized
      setIsAuthorized(true);
      setIsCheckingAuth(false);

      // Pre-fill username and salt from mobile
      if (userParam) setUsername(userParam);
      if (saltParam) setEncryptedSalt(saltParam);

      // Set timeout to redirect after 5 minutes
      const timeout = setTimeout(() => {
        setError("Session expired. Please reopen from the mobile app.");
        setIsAuthorized(false);
      }, 5 * 60 * 1000);

      setSessionTimeout(timeout);
    };

    checkAuthorization();

    // Mark MAT as used when user navigates away or closes tab
    const handleBeforeUnload = () => {
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      if (mat && isAuthorized) {
        sessionStorage.setItem(`mat_used_${mat}`, "true");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Mark as used on cleanup
      handleBeforeUnload();
    };
  }, [isAuthorized]);

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
    setCurrentStep(2);
  };

  const validateForm = (): boolean => {
    if (!encryptedSalt) {
      setError("Missing encrypted salt. Please open this page from the mobile app.");
      return false;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first");
      return false;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    setError(null);
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Pre-validation: ensure we have encrypted salt
      if (!encryptedSalt) {
        setError("Missing encrypted salt. Please open this page from the mobile app.");
        setLoading(false);
        return;
      }

      if (!walletAddress) {
        setError("Please connect your wallet first");
        setLoading(false);
        return;
      }

      if (!password || password.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      setCurrentStep(3);

      // 1️⃣ Prepare login proof
      setMessage("🔐 Decrypting salt and generating proof...");
      // Always decrypt fresh to avoid stale state
      const saltHex = await decryptSaltHex(encryptedSalt, password);
      setDecryptedSaltHex(saltHex);
      
      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex });

      // 2️⃣ Send proof to backend
      setMessage("📡 Authenticating with server...");
      const resp = await loginUser(username, proofBundle);

      if (!resp.token) throw new Error("Login failed: no token received");

      setMessage("✅ Login successful! Returning to the app...");

      // 3️⃣ Mark MAT as used to prevent reuse
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      if (mat) {
        sessionStorage.setItem(`mat_used_${mat}`, "true");
      }

      // 4️⃣ Construct query params with session ID
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        sessionId: resp.sessionId || "",
      }).toString();

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 5️⃣ Redirect back to mobile app
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://login-success?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        const redirectUrl = `sentriapp://login-success?${queryParams}`;
        window.location.href = redirectUrl;
      }

      // 6️⃣ Close the tab after redirect attempt
      setTimeout(() => {
        window.close();
        // Fallback: if window.close() doesn't work, replace with blank page
        if (!window.closed) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h2>✅ Login Complete</h2><p>You can now close this tab and return to the app.</p></div></div>';
        }
      }, 500)

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setCurrentStep(2); // Go back to form
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while checking authorization
  if (isCheckingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.authCheck}>
          <div className={styles.spinner}></div>
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied screen if not authorized
  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <div className={styles.lockIcon}>🔒</div>
          <h1>Access Restricted</h1>
          <p>{error}</p>
          <div className={styles.instructions}>
            <h3>How to Login:</h3>
            <ol>
              <li>Open the SentriApp mobile application</li>
              <li>Tap on "Open Web Login"</li>
              <li>Complete the login process</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandLogo}>
            <div className={styles.logoGradient}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" fill="url(#grad1)" stroke="white" strokeWidth="2"/>
                <circle cx="24" cy="24" r="8" fill="white"/>
                <defs>
                  <linearGradient id="grad1" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10b981"/>
                    <stop offset="1" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className={styles.brandName}>SentriZK</h1>
              <p className={styles.brandTagline}>Secure Login Portal</p>
            </div>
          </div>
        </div>

        {username && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userLabel}>Logging in as</span>
              <span className={styles.userName}>{username}</span>
            </div>
          </div>
        )}

        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{width: `${(currentStep/3)*100}%`}}></div>
          </div>
          <div className={styles.progressSteps}>
            <div className={`${styles.progressStep} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.complete : ''}`}>
              <div className={styles.stepCircle}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span>Connect</span>
            </div>
            <div className={`${styles.progressStep} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.complete : ''}`}>
              <div className={styles.stepCircle}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span>Authenticate</span>
            </div>
            <div className={`${styles.progressStep} ${currentStep >= 3 ? styles.active : ''}`}>
              <div className={styles.stepCircle}>3</div>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {currentStep === 1 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Connect Your Wallet</h2>
              <p>Use the same device wallet you registered with</p>
            </div>
            <WalletConnector onWalletConnected={handleWalletConnected} />
          </div>
        )}

        {currentStep === 2 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Enter Your Password</h2>
              <p>Decrypt your credentials to complete authentication</p>
            </div>

            <div className={styles.statusCards}>
              <div className={styles.statusCard}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect width="20" height="20" rx="4" fill="#10b981"/>
                  <path d="M14 10C14 9.44772 13.5523 9 13 9H7C6.44772 9 6 9.44772 6 10V13C6 13.5523 6.44772 14 7 14H13C13.5523 14 14 13.5523 14 13V10Z" fill="white"/>
                </svg>
                <div>
                  <span className={styles.statusLabel}>Wallet</span>
                  <span className={styles.statusValue}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
              </div>
              <div className={styles.statusCard}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect width="20" height="20" rx="4" fill="#f59e0b"/>
                  <path d="M10 7V10M10 13H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div>
                  <span className={styles.statusLabel}>Salt Status</span>
                  <span className={styles.statusValue}>
                    {decryptedSaltHex ? '🔓 Decrypted' : encryptedSalt ? '🔒 Encrypted' : '❌ Missing'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={styles.input}
                  disabled={loading}
                  required
                  autoFocus
                />
                <span className={styles.hint}>Used to decrypt your salt locally</span>
              </div>

              {error && (
                <div className={styles.error}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M10 6V11M10 14V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className={styles.actions}>
                <button type="submit" disabled={loading} className={styles.primaryBtn}>
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Login Securely
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(1)} 
                  disabled={loading}
                  className={styles.secondaryBtn}
                >
                  ← Change Wallet
                </button>
              </div>
            </form>
          </div>
        )}

        {currentStep === 3 && (
          <div className={styles.content}>
            <div className={styles.processing}>
              <div className={styles.processingIcon}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="url(#grad2)" strokeWidth="4" strokeDasharray="188" strokeDashoffset="0" className={styles.processingCircle}/>
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#10b981"/>
                      <stop offset="1" stopColor="#06b6d4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Authenticating</h2>
              <p className={styles.processingMessage}>{message || 'Verifying credentials...'}</p>
              <div className={styles.securityIndicators}>
                <div className={styles.indicator}>
                  <div className={styles.indicatorIcon}>🔐</div>
                  <span>Decrypting Salt</span>
                </div>
                <div className={styles.indicator}>
                  <div className={styles.indicatorIcon}>🔒</div>
                  <span>Generating Proof</span>
                </div>
                <div className={styles.indicator}>
                  <div className={styles.indicatorIcon}>✨</div>
                  <span>Validating Session</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.securityBadges}>
            <span>🔒 Password Protected</span>
            <span>🛡️ Zero-Knowledge</span>
            <span>⏰ 30min Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}
